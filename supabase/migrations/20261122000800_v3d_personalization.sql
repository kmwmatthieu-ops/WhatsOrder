-- Migration V3-D : Personnalisation « Pour vous », Consentement, Activité Client & Effacement
-- Basée sur docs/CAHIER_V3_EXPLORER.md (Sections 3B, 4, 5, 6, 7)

-- 1. Table d'activité des clients (exclusivement pour les clients ayant consenti)
create table if not exists public.customer_activity (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('view', 'click', 'search', 'order')),
  product_id uuid references public.products(id) on delete set null,
  shop_id uuid references public.shops(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  search_query text,
  created_at timestamptz not null default now()
);

-- Colonne de synchronisation sur customer_profiles pour interopérabilité V3-A & V3-D
alter table public.customer_profiles
  add column if not exists has_consented_personalization boolean not null default false;

update public.customer_profiles
set has_consented_personalization = (coalesce(activity_consent, false) and coalesce(personalization_enabled, true));

-- Index pour calcul rapide du score personnalisé et filtrage temporel
create index if not exists idx_customer_activity_customer_recent 
  on public.customer_activity (customer_id, created_at desc);

create index if not exists idx_customer_activity_type 
  on public.customer_activity (activity_type);

create index if not exists idx_customer_activity_product_recent
  on public.customer_activity (product_id, created_at desc);

-- 2. Sécurité RLS stricte (Section 4 & 6)
alter table public.customer_activity enable row level security;

-- Un client ne peut lire que ses propres activités
drop policy if exists "customer_activity_select_own" on public.customer_activity;
create policy "customer_activity_select_own"
  on public.customer_activity for select
  using (
    customer_id = (select auth.uid())
    or (select auth.jwt() ->> 'role') = 'service_role'
  );

-- Un client ne peut insérer que pour son propre compte
drop policy if exists "customer_activity_insert_own" on public.customer_activity;
create policy "customer_activity_insert_own"
  on public.customer_activity for insert
  with check (
    customer_id = (select auth.uid())
    or (select auth.jwt() ->> 'role') = 'service_role'
  );

-- Interdiction de modification directe
drop policy if exists "customer_activity_update_none" on public.customer_activity;
create policy "customer_activity_update_none"
  on public.customer_activity for update
  using (false);

-- Suppression réservée au client pour ses propres données
drop policy if exists "customer_activity_delete_own" on public.customer_activity;
create policy "customer_activity_delete_own"
  on public.customer_activity for delete
  using (
    customer_id = (select auth.uid())
    or (select auth.jwt() ->> 'role') = 'service_role'
  );

-- 3. RPC sécurisée d'enregistrement d'activité (respect strict du consentement)
create or replace function public.record_customer_activity(
  p_activity_type text,
  p_product_id uuid default null,
  p_shop_id uuid default null,
  p_category_id uuid default null,
  p_search_query text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_consented boolean;
  v_cat_id uuid := p_category_id;
  v_shp_id uuid := p_shop_id;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return false;
  end if;

  if p_activity_type not in ('view', 'click', 'search', 'order') then
    return false;
  end if;

  -- Vérifier le consentement dans le profil client
  select (coalesce(has_consented_personalization, false) and coalesce(personalization_enabled, true))
  into v_consented
  from public.customer_profiles
  where id = v_user_id;

  -- Si non consenti (ou pas de profil), refus silencieux pour respecter la vie privée
  if v_consented is distinct from true then
    return false;
  end if;

  -- Auto-déduire category_id et shop_id depuis le produit si non fournis
  if p_product_id is not null and (v_cat_id is null or v_shp_id is null) then
    select category_id, shop_id into v_cat_id, v_shp_id
    from public.products
    where id = p_product_id;
  end if;

  insert into public.customer_activity (
    customer_id,
    activity_type,
    product_id,
    shop_id,
    category_id,
    search_query
  ) values (
    v_user_id,
    p_activity_type,
    p_product_id,
    coalesce(p_shop_id, v_shp_id),
    coalesce(p_category_id, v_cat_id),
    nullif(trim(p_search_query), '')
  );

  return true;
end;
$$;

-- 4. RPC d'effacement de l'historique d'activité (droit à l'oubli)
create or replace function public.clear_my_customer_activity()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return false;
  end if;

  delete from public.customer_activity
  where customer_id = v_user_id;

  return true;
end;
$$;

-- 5. RPC pour basculer le consentement de personnalisation
create or replace function public.set_my_personalization_consent(p_consented boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return false;
  end if;

  update public.customer_profiles
  set has_consented_personalization = coalesce(p_consented, false),
      personalization_enabled = coalesce(p_consented, false),
      activity_consent = coalesce(p_consented, false),
      updated_at = now()
  where id = v_user_id;

  -- Si l'utilisateur révoque son consentement, purger immédiatement son historique existant
  if p_consented = false then
    delete from public.customer_activity
    where customer_id = v_user_id;
  end if;

  return true;
end;
$$;

-- 6. RPC get_customer_activity_stats : renvoie le nombre d'activités enregistrées et le statut de consentement
create or replace function public.get_my_personalization_stats()
returns table (
  has_consented boolean,
  activity_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return query select false, 0::bigint;
    return;
  end if;

  return query
  select 
    coalesce(cp.has_consented_personalization, false) as has_consented,
    count(ca.id) as activity_count
  from public.customer_profiles cp
  left join public.customer_activity ca on ca.customer_id = cp.id
  where cp.id = v_user_id
  group by cp.has_consented_personalization;
end;
$$;

-- 7. RPC get_for_you_products : Classement personnalisé pour l'onglet « Pour vous »
drop function if exists public.get_for_you_products(integer, integer);

create or replace function public.get_for_you_products(
  p_limit integer default 60,
  p_offset integer default 0
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
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_user_id uuid;
  v_has_consented boolean := false;
  v_max_fetch integer;
  v_last_shop_id uuid := null;
  v_second_last_shop_id uuid := null;
  v_count integer := 0;
  v_cand record;
  v_found boolean;
begin
  v_user_id := auth.uid();
  v_max_fetch := coalesce(p_limit, 60) + coalesce(p_offset, 0);

  if v_user_id is not null then
    select coalesce(has_consented_personalization, false) into v_has_consented
    from public.customer_profiles
    where id = v_user_id;
  end if;

  create temp table if not exists tmp_for_you_cand (
    product_id uuid primary key,
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
    shop_is_certified boolean,
    raw_score numeric,
    is_out_of_stock integer,
    picked boolean default false
  ) on commit drop;

  truncate tmp_for_you_cand;

  insert into tmp_for_you_cand (
    product_id, product_name, product_description, product_price, product_discount_percent,
    product_image_url, product_stock, product_created_at, category_id, category_name,
    shop_id, shop_name, shop_slug, shop_logo_url, shop_primary_color, shop_is_certified, raw_score, is_out_of_stock
  )
  select 
    subq.product_id,
    subq.product_name,
    subq.product_description,
    subq.product_price,
    subq.product_discount_percent,
    subq.product_image_url,
    subq.product_stock,
    subq.product_created_at,
    subq.category_id,
    subq.category_name,
    subq.shop_id,
    subq.shop_name,
    subq.shop_slug,
    subq.shop_logo_url,
    subq.shop_primary_color,
    subq.shop_is_certified,
    subq.raw_score,
    subq.is_out_of_stock
  from (
    select 
      p.id as product_id,
      p.name as product_name,
      p.description as product_description,
      p.price as product_price,
      coalesce(p.discount_percent, 0) as product_discount_percent,
      case when cardinality(p.images) > 0 then p.images[1] else null end as product_image_url,
      p.stock as product_stock,
      p.created_at as product_created_at,
      c.id as category_id,
      c.name as category_name,
      s.id as shop_id,
      s.name as shop_name,
      s.slug as shop_slug,
      s.logo_url as shop_logo_url,
      s.primary_color as shop_primary_color,
      case 
        when s.identity_verified = true 
         and coalesce(sp.has_certified_badge, false) = true 
         and coalesce(sub.status::text, '') = 'active'
         and (sub.expires_at is null or sub.expires_at > now()) 
        then true 
        else false 
      end as shop_is_certified,
      -- Score Pour vous : affinité catégorie + affinité boutique suivie + fraîcheur + popularité globale
      (
        -- 1. Bonus affinité catégorie (si consenti et historique dans les 30 derniers jours)
        coalesce(cat_affinity.affinity_weight, 0.0) * 150.0
        +
        -- 2. Bonus boutique suivie par le client
        case when followed_shops.shop_id is not null then 200.0 else 0.0 end
        +
        -- 3. Fraîcheur du produit pondérée par le coefficient de forfait
        (
          (100.0 / (1.0 + extract(epoch from (now() - p.created_at)) / 86400.0))
          *
          case 
            when coalesce(sub.status::text, '') = 'active'
             and (sub.expires_at is null or sub.expires_at > now()) 
            then coalesce(sp.visibility_multiplier, 1.0) 
            else 1.0 
          end
        )
        +
        -- 4. Popularité globale récente (interactions sur les 7 derniers jours)
        coalesce(pop.global_weight, 0.0) * 10.0
      ) as raw_score,
      case when p.stock is null or p.stock > 0 then 0 else 1 end as is_out_of_stock
    from public.products p
    join public.shops s on s.id = p.shop_id
    left join public.categories c on c.id = p.category_id
    left join public.shop_subscriptions sub on sub.shop_id = s.id
    left join public.subscription_plans sp on sp.id = coalesce(sub.plan_id, 'gratuit')
    -- Boutiques suivies par l'utilisateur
    left join (
      select sf.shop_id
      from public.shop_followers sf
      where sf.user_id = v_user_id
    ) followed_shops on followed_shops.shop_id = s.id
    -- Affinité catégories de l'utilisateur (30 derniers jours)
    left join (
      select 
        ca.category_id,
        count(*)::numeric as affinity_weight
      from public.customer_activity ca
      where ca.customer_id = v_user_id
        and ca.created_at >= (now() - interval '30 days')
        and ca.category_id is not null
      group by ca.category_id
    ) cat_affinity on cat_affinity.category_id = c.id
    -- Popularité globale (7 derniers jours)
    left join (
      select 
        ca_glob.product_id,
        count(*)::numeric as global_weight
      from public.customer_activity ca_glob
      where ca_glob.created_at >= (now() - interval '7 days')
        and ca_glob.product_id is not null
      group by ca_glob.product_id
    ) pop on pop.product_id = p.id
    where s.status = 'active'
      and s.is_listed_in_explorer = true
      and p.is_available = true
      and p.is_hidden = false
      and cardinality(p.images) > 0
  ) subq
  order by 
    subq.is_out_of_stock asc,
    subq.raw_score desc,
    subq.product_created_at desc
  limit 250;

  create temp table if not exists tmp_for_you_res (
    seq_order serial primary key,
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
  ) on commit drop;

  truncate tmp_for_you_res;

  -- Garde-fou diversité : pas plus de 2 produits consécutifs de la même boutique
  loop
    exit when v_count >= v_max_fetch;

    v_found := false;

    if v_last_shop_id is not null and v_second_last_shop_id is not null and v_last_shop_id = v_second_last_shop_id then
      select * into v_cand
      from tmp_for_you_cand c
      where not c.picked and c.shop_id <> v_last_shop_id
      order by c.is_out_of_stock asc, c.raw_score desc, c.product_created_at desc
      limit 1;

      if found then
        v_found := true;
      else
        -- Garde-fou strict : pas plus de 2 produits de la même boutique à la suite
        exit;
      end if;
    end if;

    if not v_found then
      select * into v_cand
      from tmp_for_you_cand c
      where not c.picked
      order by c.is_out_of_stock asc, c.raw_score desc, c.product_created_at desc
      limit 1;

      if not found then
        exit;
      end if;
    end if;

    update tmp_for_you_cand c set picked = true where c.product_id = v_cand.product_id;

    insert into tmp_for_you_res (
      product_id, product_name, product_description, product_price, product_discount_percent,
      product_image_url, product_stock, product_created_at, category_id, category_name,
      shop_id, shop_name, shop_slug, shop_logo_url, shop_primary_color, shop_is_certified
    ) values (
      v_cand.product_id, v_cand.product_name, v_cand.product_description, v_cand.product_price, v_cand.product_discount_percent,
      v_cand.product_image_url, v_cand.product_stock, v_cand.product_created_at, v_cand.category_id, v_cand.category_name,
      v_cand.shop_id, v_cand.shop_name, v_cand.shop_slug, v_cand.shop_logo_url, v_cand.shop_primary_color, v_cand.shop_is_certified
    );

    v_second_last_shop_id := v_last_shop_id;
    v_last_shop_id := v_cand.shop_id;
    v_count := v_count + 1;
  end loop;

  return query
  select 
    r.product_id, r.product_name, r.product_description, r.product_price, r.product_discount_percent,
    r.product_image_url, r.product_stock, r.product_created_at, r.category_id, r.category_name,
    r.shop_id, r.shop_name, r.shop_slug, r.shop_logo_url, r.shop_primary_color, r.shop_is_certified
  from tmp_for_you_res r
  order by r.seq_order asc
  offset coalesce(p_offset, 0)
  limit coalesce(p_limit, 60);
end;
$$;

-- Permissions d'exécution
grant execute on function public.record_customer_activity(text, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.clear_my_customer_activity() to authenticated;
grant execute on function public.set_my_personalization_consent(boolean) to authenticated;
grant execute on function public.get_my_personalization_stats() to authenticated;
grant execute on function public.get_for_you_products(integer, integer) to anon, authenticated;
