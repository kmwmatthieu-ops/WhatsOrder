-- =====================================================================
-- Phase V3-A : Explorer (Fil de Produits), Visibilité, Compte Client & Modération
-- 1. Ajout de is_listed_in_explorer à shops
-- 2. Ajout de is_hidden à products
-- 3. Table customer_profiles avec RLS
-- 4. Table reports (signalements) avec RLS et actions admin
-- 5. RPC get_explorer_products, admin_list_reports, admin_resolve_report
-- =====================================================================

-- 1. Option « apparaître dans Explorer » par boutique (activée par défaut)
alter table public.shops 
  add column if not exists is_listed_in_explorer boolean not null default true;

-- 2. Modération : masquage de produit sans suppression (retire d'Explorer et du catalogue)
alter table public.products 
  add column if not exists is_hidden boolean not null default false;

-- 3. Profil Client (inscription, consentement activité, personnalisation)
create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  activity_consent boolean not null default false,
  personalization_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_profiles enable row level security;

drop policy if exists "customer_profiles_select_own" on public.customer_profiles;
create policy "customer_profiles_select_own" on public.customer_profiles
  for select using (auth.uid() = id);

drop policy if exists "customer_profiles_insert_own" on public.customer_profiles;
create policy "customer_profiles_insert_own" on public.customer_profiles
  for insert with check (auth.uid() = id);

drop policy if exists "customer_profiles_update_own" on public.customer_profiles;
create policy "customer_profiles_update_own" on public.customer_profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 4. Table des Signalements (Boutique ou Produit)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('product', 'shop')),
  product_id uuid references public.products(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending', 'resolved_hidden', 'dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "reports_insert_any" on public.reports;
create policy "reports_insert_any" on public.reports
  for insert with check (true);

drop policy if exists "reports_admin_select" on public.reports;
create policy "reports_admin_select" on public.reports
  for select using (public.is_admin());

drop policy if exists "reports_admin_update" on public.reports;
create policy "reports_admin_update" on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- 5. Index optimisés pour le fil Explorer et la modération
create index if not exists idx_products_explorer 
  on public.products (shop_id, created_at desc) 
  where is_available = true and is_hidden = false and cardinality(images) > 0;

create index if not exists idx_reports_status 
  on public.reports (status, created_at desc);

-- 6. RPC publique pour l'Explorer : filtre strict côté serveur
create or replace function public.get_explorer_products(
  p_search text default null,
  p_category text default null,
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
  shop_primary_color text
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
    s.primary_color as shop_primary_color
  from public.products p
  join public.shops s on s.id = p.shop_id
  left join public.categories c on c.id = p.category_id
  where s.status = 'active'
    and s.is_listed_in_explorer = true
    and p.is_available = true
    and p.is_hidden = false
    and cardinality(p.images) > 0
    and (
      p_search is null 
      or trim(p_search) = '' 
      or p.name ilike '%' || trim(p_search) || '%' 
      or coalesce(p.description, '') ilike '%' || trim(p_search) || '%'
      or s.name ilike '%' || trim(p_search) || '%'
    )
    and (
      p_category is null 
      or trim(p_category) = '' 
      or trim(p_category) = 'all'
      or c.name = trim(p_category)
      or c.id::text = trim(p_category)
    )
  order by 
    (case when p.stock is null or p.stock > 0 then 0 else 1 end),
    p.created_at desc
  limit coalesce(p_limit, 30)
  offset coalesce(p_offset, 0);
$$;

grant execute on function public.get_explorer_products(text, text, int, int) to anon, authenticated;

-- 7. Fonctions RPC d'administration pour la modération
create or replace function public.admin_list_reports(
  p_status text default null
)
returns table (
  id uuid,
  reporter_id uuid,
  target_type text,
  product_id uuid,
  product_name text,
  shop_id uuid,
  shop_name text,
  shop_slug text,
  reason text,
  details text,
  status text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : privilèges administrateur requis.';
  end if;

  return query
  select 
    r.id,
    r.reporter_id,
    r.target_type,
    r.product_id,
    p.name as product_name,
    r.shop_id,
    s.name as shop_name,
    s.slug as shop_slug,
    r.reason,
    r.details,
    r.status,
    r.reviewed_by,
    r.reviewed_at,
    r.created_at
  from public.reports r
  left join public.products p on p.id = r.product_id
  left join public.shops s on s.id = r.shop_id
  where (p_status is null or p_status = '' or r.status = p_status)
  order by r.created_at desc;
end;
$$;

create or replace function public.admin_resolve_report(
  p_report_id uuid,
  p_action text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report record;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : privilèges administrateur requis.';
  end if;

  select * into v_report from public.reports where id = p_report_id;
  if not found then
    raise exception 'Signalement introuvable.';
  end if;

  if p_action = 'hide_product' then
    if v_report.product_id is not null then
      update public.products set is_hidden = true where id = v_report.product_id;
    end if;
    update public.reports
      set status = 'resolved_hidden',
          reviewed_by = auth.uid(),
          reviewed_at = now(),
          details = coalesce(details, '') || case when p_notes is not null then ' [Notes: ' || p_notes || ']' else '' end
      where id = p_report_id;

  elsif p_action = 'suspend_shop' then
    if v_report.shop_id is not null then
      update public.shops set status = 'suspended' where id = v_report.shop_id;
    end if;
    update public.reports
      set status = 'resolved_hidden',
          reviewed_by = auth.uid(),
          reviewed_at = now(),
          details = coalesce(details, '') || case when p_notes is not null then ' [Notes: ' || p_notes || ']' else '' end
      where id = p_report_id;

  elsif p_action = 'dismiss' then
    update public.reports
      set status = 'dismissed',
          reviewed_by = auth.uid(),
          reviewed_at = now(),
          details = coalesce(details, '') || case when p_notes is not null then ' [Notes: ' || p_notes || ']' else '' end
      where id = p_report_id;
  else
    raise exception 'Action invalide : hide_product, suspend_shop ou dismiss attendu.';
  end if;

  return jsonb_build_object('ok', true, 'action', p_action);
end;
$$;

grant execute on function public.admin_list_reports(text) to authenticated;
grant execute on function public.admin_resolve_report(uuid, text, text) to authenticated;
