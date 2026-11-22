-- =====================================================================
-- Phase V3-B : Système d'Abonnements Client-Boutique, Compteur d'Abonnés & Fil Suivi
-- 1. Ajout de followers_count sur public.shops
-- 2. Création de public.shop_followers avec RLS stricte
-- 3. Trigger automatique pour le compteur d'abonnés
-- 4. RPC toggle_follow_shop(p_shop_id)
-- 5. RPC is_following_shop(p_shop_id)
-- 6. RPC get_my_followed_shops()
-- 7. RPC get_followed_shops_products()
-- =====================================================================

-- 1. Compteur dénormalisé sur les boutiques
alter table public.shops 
  add column if not exists followers_count integer not null default 0;

-- 2. Table des abonnements boutiques (shop_followers)
create table if not exists public.shop_followers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_shop_followers_user_shop unique (user_id, shop_id)
);

create index if not exists idx_shop_followers_user on public.shop_followers(user_id);
create index if not exists idx_shop_followers_shop on public.shop_followers(shop_id);

-- 3. RLS stricte sur shop_followers
alter table public.shop_followers enable row level security;

drop policy if exists "shop_followers_select_own" on public.shop_followers;
create policy "shop_followers_select_own" on public.shop_followers
  for select using (auth.uid() = user_id);

drop policy if exists "shop_followers_insert_own" on public.shop_followers;
create policy "shop_followers_insert_own" on public.shop_followers
  for insert with check (auth.uid() = user_id);

drop policy if exists "shop_followers_delete_own" on public.shop_followers;
create policy "shop_followers_delete_own" on public.shop_followers
  for delete using (auth.uid() = user_id);

-- 4. Trigger de synchronisation automatique du compteur
create or replace function public.handle_shop_followers_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.shops 
    set followers_count = followers_count + 1 
    where id = NEW.shop_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.shops 
    set followers_count = greatest(0, followers_count - 1) 
    where id = OLD.shop_id;
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_shop_followers_count on public.shop_followers;
create trigger trg_shop_followers_count
after insert or delete on public.shop_followers
for each row execute function public.handle_shop_followers_count();

-- Initialiser le compteur existant
update public.shops s
set followers_count = (
  select count(*)::integer 
  from public.shop_followers f 
  where f.shop_id = s.id
);

-- 5. RPC toggle_follow_shop : Suivre / Ne plus suivre
create or replace function public.toggle_follow_shop(p_shop_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_shop_status text;
  v_existing_id uuid;
  v_new_count integer;
  v_following boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentification requise pour suivre une boutique';
  end if;

  -- Vérifier que la boutique existe et est active
  select status into v_shop_status
  from public.shops
  where id = p_shop_id;

  if v_shop_status is null then
    raise exception 'Boutique introuvable';
  end if;

  if v_shop_status != 'active' then
    raise exception 'Cette boutique n''est pas active';
  end if;

  -- Vérifier si l'utilisateur suit déjà
  select id into v_existing_id
  from public.shop_followers
  where user_id = v_user_id and shop_id = p_shop_id;

  if v_existing_id is not null then
    -- Désabonnement
    delete from public.shop_followers where id = v_existing_id;
    v_following := false;
  else
    -- Abonnement
    insert into public.shop_followers (user_id, shop_id)
    values (v_user_id, p_shop_id);
    v_following := true;
  end if;

  -- Récupérer le compteur à jour
  select followers_count into v_new_count
  from public.shops
  where id = p_shop_id;

  return jsonb_build_object(
    'following', v_following,
    'followers_count', coalesce(v_new_count, 0)
  );
end;
$$;

-- 6. RPC is_following_shop
create or replace function public.is_following_shop(p_shop_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 
    from public.shop_followers 
    where user_id = auth.uid() 
      and shop_id = p_shop_id
  );
$$;

-- 7. RPC get_my_followed_shops : Liste des boutiques suivies par le client connecté
create or replace function public.get_my_followed_shops()
returns table (
  shop_id uuid,
  shop_name text,
  shop_slug text,
  shop_logo_url text,
  shop_primary_color text,
  is_certified boolean,
  followers_count integer,
  products_count bigint,
  followed_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select 
    s.id as shop_id,
    s.name as shop_name,
    s.slug as shop_slug,
    s.logo_url as shop_logo_url,
    s.primary_color as shop_primary_color,
    s.is_certified,
    s.followers_count,
    coalesce(count(p.id) filter (where p.is_available = true and p.is_hidden = false), 0)::bigint as products_count,
    f.created_at as followed_at
  from public.shop_followers f
  join public.shops s on s.id = f.shop_id
  left join public.products p on p.shop_id = s.id
  where f.user_id = auth.uid()
    and s.status = 'active'
  group by s.id, f.created_at
  order by f.created_at desc;
$$;

-- 8. RPC get_followed_shops_products : Fil des boutiques suivies pour Explorer
create or replace function public.get_followed_shops_products(
  p_limit int default 30,
  p_offset int default 0
)
returns table (
  product_id uuid,
  product_name text,
  product_description text,
  product_price integer,
  product_discount_percent integer,
  product_image_url text,
  product_stock integer,
  product_created_at timestamptz,
  category_id uuid,
  category_name text,
  shop_id uuid,
  shop_name text,
  shop_slug text,
  shop_logo_url text,
  shop_primary_color text,
  shop_is_certified boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select 
    p.id as product_id,
    p.name as product_name,
    p.description as product_description,
    p.price as product_price,
    coalesce(p.discount_percent, 0) as product_discount_percent,
    p.images[1] as product_image_url,
    p.stock as product_stock,
    p.created_at as product_created_at,
    c.id as category_id,
    c.name as category_name,
    s.id as shop_id,
    s.name as shop_name,
    s.slug as shop_slug,
    s.logo_url as shop_logo_url,
    s.primary_color as shop_primary_color,
    s.is_certified as shop_is_certified
  from public.products p
  join public.shops s on s.id = p.shop_id
  join public.shop_followers f on f.shop_id = s.id and f.user_id = auth.uid()
  left join public.categories c on c.id = p.category_id
  where s.status = 'active'
    and s.is_listed_in_explorer = true
    and p.is_available = true
    and p.is_hidden = false
    and cardinality(p.images) > 0
  order by 
    -- Promotions d'abord si réduction active
    (case when coalesce(p.discount_percent, 0) > 0 then 0 else 1 end),
    p.created_at desc
  limit coalesce(p_limit, 30)
  offset coalesce(p_offset, 0);
$$;
