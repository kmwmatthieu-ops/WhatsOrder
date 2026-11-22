-- =====================================================================
-- Phase V3-C : Paramètres de forfait, Classement Explorer, Badge de certification
--              et Réglages de la plateforme (Communauté WhatsApp)
-- =====================================================================

-- 0. MISE À JOUR DE is_admin POUR AUTORISER LE SERVICE_ROLE (ET LES ADMINS AUTHENTIFIÉS)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select auth.jwt() ->> 'role') = 'service_role'
    or exists (select 1 from public.admins where user_id = (select auth.uid())),
    false
  );
$$;

grant execute on function public.is_admin() to anon, authenticated, service_role;

-- 1. PARAMÈTRES DE FORFAIT DANS public.subscription_plans
alter table public.subscription_plans
  add column if not exists visibility_multiplier numeric(3, 1) not null default 1.0,
  add column if not exists has_certified_badge boolean not null default false;

-- Valeurs par défaut exigées
update public.subscription_plans set visibility_multiplier = 1.0, has_certified_badge = false where id = 'gratuit';
update public.subscription_plans set visibility_multiplier = 1.5, has_certified_badge = false where id = 'business';
update public.subscription_plans set visibility_multiplier = 2.5, has_certified_badge = true where id = 'premium';

-- 2. IDENTITÉ VÉRIFIÉE PAR BOUTIQUE DANS public.shops
alter table public.shops
  add column if not exists identity_verified boolean not null default false;

-- Conserver les boutiques ayant déjà été certifiées pour garantir zéro perte de données
update public.shops set identity_verified = true where is_certified = true;

-- 3. RÉGLAGES GLOBAUX DE LA PLATEFORME (Lien Communauté WhatsApp)
create table if not exists public.platform_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.platform_settings enable row level security;

drop policy if exists "platform_settings_select_all" on public.platform_settings;
create policy "platform_settings_select_all" on public.platform_settings
  for select using (true);

drop policy if exists "platform_settings_admin_all" on public.platform_settings;
create policy "platform_settings_admin_all" on public.platform_settings
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.platform_settings (key, value)
values ('community_whatsapp_url', '')
on conflict (key) do nothing;

-- 4. RPC ADMIN POUR METTRE À JOUR LES PARAMÈTRES D'UN FORFAIT
create or replace function public.admin_update_subscription_plan(
  p_plan_id text,
  p_visibility_multiplier numeric,
  p_has_certified_badge boolean,
  p_price_monthly integer default null,
  p_max_products integer default null,
  p_max_orders_per_month integer default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur uniquement.';
  end if;

  update public.subscription_plans
  set 
    visibility_multiplier = coalesce(p_visibility_multiplier, visibility_multiplier),
    has_certified_badge = coalesce(p_has_certified_badge, has_certified_badge),
    price_monthly = coalesce(p_price_monthly, price_monthly),
    max_products = coalesce(p_max_products, max_products),
    max_orders_per_month = coalesce(p_max_orders_per_month, max_orders_per_month),
    updated_at = now()
  where id = p_plan_id;

  return true;
end;
$$;

grant execute on function public.admin_update_subscription_plan(text, numeric, boolean, integer, integer, integer) to authenticated, service_role;

-- 5. RPC ADMIN POUR METTRE À JOUR UN RÉGLAGE DE LA PLATEFORME
create or replace function public.admin_set_platform_setting(
  p_key text,
  p_value text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur uniquement.';
  end if;

  insert into public.platform_settings (key, value, updated_at, updated_by)
  values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update
  set value = excluded.value,
      updated_at = now(),
      updated_by = excluded.updated_by;

  return true;
end;
$$;

grant execute on function public.admin_set_platform_setting(text, text) to authenticated, service_role;

-- 6. RPC ADMIN POUR BASCULER L'IDENTITÉ VÉRIFIÉE D'UNE BOUTIQUE
create or replace function public.admin_toggle_identity_verified(
  p_shop_id uuid,
  p_identity_verified boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur uniquement.';
  end if;

  update public.shops
  set identity_verified = p_identity_verified,
      updated_at = now()
  where id = p_shop_id;

  return true;
end;
$$;

grant execute on function public.admin_toggle_identity_verified(uuid, boolean) to authenticated, service_role;

-- 7. MISE À JOUR DE admin_list_shops POUR RENVOYER identity_verified ET is_certified DYNAMIQUE
drop function if exists public.admin_list_shops();

create or replace function public.admin_list_shops()
returns table (
  id uuid,
  name text,
  slug text,
  owner_id uuid,
  owner_email text,
  status public.shop_status,
  created_at timestamptz,
  orders_count bigint,
  identity_verified boolean,
  is_certified boolean,
  plan_id text,
  plan_name text,
  subscription_status text,
  subscription_expires_at timestamptz,
  subscription_notes text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN_NOT_ADMIN' using errcode = '42501';
  end if;

  return query
  select
    s.id,
    s.name,
    s.slug,
    s.owner_id,
    coalesce(u.email::text, 'Inconnu') as owner_email,
    s.status,
    s.created_at,
    count(distinct o.id) as orders_count,
    s.identity_verified,
    case
      when s.identity_verified = true
       and coalesce(p.has_certified_badge, false) = true
       and coalesce(sub.status::text, '') = 'active'
       and (sub.expires_at is null or sub.expires_at > now())
      then true
      else false
    end as is_certified,
    coalesce(sub.plan_id, 'gratuit') as plan_id,
    coalesce(p.name, 'Gratuit') as plan_name,
    coalesce(sub.status::text, 'active') as subscription_status,
    sub.expires_at as subscription_expires_at,
    sub.notes as subscription_notes
  from public.shops s
  left join auth.users u on u.id = s.owner_id
  left join public.orders o on o.shop_id = s.id
  left join public.shop_subscriptions sub on sub.shop_id = s.id
  left join public.subscription_plans p on p.id = coalesce(sub.plan_id, 'gratuit')
  group by s.id, u.email, s.identity_verified, p.has_certified_badge, sub.plan_id, p.name, sub.status, sub.expires_at, sub.notes
  order by s.created_at desc;
end $$;

grant execute on function public.admin_list_shops() to authenticated, service_role;

-- 8. MISE À JOUR DE get_explorer_products AVEC MULTIPLICATEUR DE FORFAIT ET GARDE-FOUS STRICTS
drop function if exists public.get_explorer_products(text, text, integer, integer);

create or replace function public.get_explorer_products(
  p_search text default null,
  p_category text default null,
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
  shop_is_certified boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_search text;
  v_category text;
  v_max_fetch integer;
  v_last_shop_id uuid := null;
  v_second_last_shop_id uuid := null;
  v_count integer := 0;
  v_cand record;
  v_found boolean;
begin
  v_search := nullif(trim(p_search), '');
  v_category := nullif(trim(p_category), '');
  v_max_fetch := coalesce(p_limit, 60) + coalesce(p_offset, 0);

  create temp table if not exists tmp_explorer_cand (
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
    shop_is_certified boolean,
    raw_score numeric,
    is_out_of_stock integer,
    picked boolean default false
  ) on commit drop;

  truncate tmp_explorer_cand;

  insert into tmp_explorer_cand (
    product_id, product_name, product_description, product_price, product_discount_percent,
    product_image_url, product_stock, product_created_at, category_id, category_name,
    shop_id, shop_name, shop_slug, shop_logo_url, shop_is_certified, raw_score, is_out_of_stock
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
      case 
        when s.identity_verified = true 
         and coalesce(sp.has_certified_badge, false) = true 
         and coalesce(sub.status::text, '') = 'active'
         and (sub.expires_at is null or sub.expires_at > now()) 
        then true 
        else false 
      end as shop_is_certified,
      (
        case
          when v_search is null then 100
          when lower(p.name) = lower(v_search) then 500
          when p.name ilike v_search || '%' then 400
          when p.name ilike '%' || v_search || '%' then 300
          when c.name ilike '%' || v_search || '%' or s.name ilike '%' || v_search || '%' then 200
          when coalesce(p.description, '') ilike '%' || v_search || '%' then 100
          else 0
        end * 1000.0
        +
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
      ) as raw_score,
      case when p.stock is null or p.stock > 0 then 0 else 1 end as is_out_of_stock
    from public.products p
    join public.shops s on s.id = p.shop_id
    left join public.categories c on c.id = p.category_id
    left join public.shop_subscriptions sub on sub.shop_id = s.id
    left join public.subscription_plans sp on sp.id = coalesce(sub.plan_id, 'gratuit')
    where s.status = 'active'
      and s.is_listed_in_explorer = true
      and p.is_available = true
      and p.is_hidden = false
      and cardinality(p.images) > 0
      and (
        v_category is null 
        or v_category = 'all'
        or (c.name is not null and c.name ilike v_category)
        or c.id::text = v_category
      )
      and (
        v_search is null 
        or p.name ilike '%' || v_search || '%'
        or coalesce(p.description, '') ilike '%' || v_search || '%'
        or s.name ilike '%' || v_search || '%'
        or coalesce(c.name, '') ilike '%' || v_search || '%'
      )
  ) subq
  order by 
    subq.is_out_of_stock asc,
    subq.raw_score desc,
    subq.product_created_at desc
  limit 250;

  create temp table if not exists tmp_explorer_res (
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
    shop_is_certified boolean
  ) on commit drop;

  truncate tmp_explorer_res;

  loop
    exit when v_count >= v_max_fetch;

    v_found := false;

    -- Si les 2 derniers produits sont de la même boutique, chercher en priorité une autre boutique
    if v_last_shop_id is not null and v_second_last_shop_id is not null and v_last_shop_id = v_second_last_shop_id then
      select * into v_cand
      from tmp_explorer_cand c
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
      from tmp_explorer_cand c
      where not c.picked
      order by c.is_out_of_stock asc, c.raw_score desc, c.product_created_at desc
      limit 1;

      if not found then
        exit;
      end if;
    end if;

    update tmp_explorer_cand c set picked = true where c.product_id = v_cand.product_id;

    insert into tmp_explorer_res (
      product_id, product_name, product_description, product_price, product_discount_percent,
      product_image_url, product_stock, product_created_at, category_id, category_name,
      shop_id, shop_name, shop_slug, shop_logo_url, shop_is_certified
    ) values (
      v_cand.product_id, v_cand.product_name, v_cand.product_description, v_cand.product_price, v_cand.product_discount_percent,
      v_cand.product_image_url, v_cand.product_stock, v_cand.product_created_at, v_cand.category_id, v_cand.category_name,
      v_cand.shop_id, v_cand.shop_name, v_cand.shop_slug, v_cand.shop_logo_url, v_cand.shop_is_certified
    );

    v_second_last_shop_id := v_last_shop_id;
    v_last_shop_id := v_cand.shop_id;
    v_count := v_count + 1;
  end loop;

  return query
  select 
    r.product_id, r.product_name, r.product_description, r.product_price, r.product_discount_percent,
    r.product_image_url, r.product_stock, r.product_created_at, r.category_id, r.category_name,
    r.shop_id, r.shop_name, r.shop_slug, r.shop_logo_url, r.shop_is_certified
  from tmp_explorer_res r
  order by r.seq_order asc
  offset coalesce(p_offset, 0)
  limit coalesce(p_limit, 60);
end;
$$;

grant execute on function public.get_explorer_products(text, text, integer, integer) to anon, authenticated, service_role;

-- 9. MISE À JOUR DE get_my_followed_shops ET get_followed_shops_products AVEC LE BADGE DYNAMIQUE
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
    case
      when s.identity_verified = true
       and coalesce(sp.has_certified_badge, false) = true
       and coalesce(sub.status::text, '') = 'active'
       and (sub.expires_at is null or sub.expires_at > now())
      then true
      else false
    end as is_certified,
    s.followers_count,
    coalesce(count(p.id) filter (where p.is_available = true and p.is_hidden = false), 0)::bigint as products_count,
    f.created_at as followed_at
  from public.shop_followers f
  join public.shops s on s.id = f.shop_id
  left join public.products p on p.shop_id = s.id
  left join public.shop_subscriptions sub on sub.shop_id = s.id
  left join public.subscription_plans sp on sp.id = coalesce(sub.plan_id, 'gratuit')
  where f.user_id = auth.uid()
    and s.status = 'active'
  group by s.id, f.created_at, s.identity_verified, sp.has_certified_badge, sub.status, sub.expires_at
  order by f.created_at desc;
$$;

grant execute on function public.get_my_followed_shops() to authenticated, service_role;

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
    case
      when s.identity_verified = true
       and coalesce(sp.has_certified_badge, false) = true
       and coalesce(sub.status::text, '') = 'active'
       and (sub.expires_at is null or sub.expires_at > now())
      then true
      else false
    end as shop_is_certified
  from public.products p
  join public.shops s on s.id = p.shop_id
  join public.shop_followers f on f.shop_id = s.id and f.user_id = auth.uid()
  left join public.categories c on c.id = p.category_id
  left join public.shop_subscriptions sub on sub.shop_id = s.id
  left join public.subscription_plans sp on sp.id = coalesce(sub.plan_id, 'gratuit')
  where s.status = 'active'
    and s.is_listed_in_explorer = true
    and p.is_available = true
    and p.is_hidden = false
    and cardinality(p.images) > 0
  group by p.id, c.id, c.name, s.id, sp.has_certified_badge, sub.status, sub.expires_at
  order by 
    (case when coalesce(p.discount_percent, 0) > 0 then 0 else 1 end),
    p.created_at desc
  limit coalesce(p_limit, 30)
  offset coalesce(p_offset, 0);
$$;

grant execute on function public.get_followed_shops_products(int, int) to authenticated, service_role;
