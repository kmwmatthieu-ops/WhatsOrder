-- =====================================================================
-- Migration V3-B : Système de Certification Commerçant & Badge Vérifié
-- =====================================================================

-- 1. Ajout de l'indicateur is_certified sur les boutiques
alter table public.shops 
add column if not exists is_certified boolean default false not null;

-- 2. Création du bucket de stockage pour les documents de certification
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'certification-docs',
  'certification-docs',
  true,
  52428800, -- 50 Mo pour les vidéos et documents PDF
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do nothing;

-- Politiques RLS sur le bucket de stockage certification-docs
drop policy if exists "certification_docs_owner_insert" on storage.objects;
create policy "certification_docs_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'certification-docs'
    and (storage.foldername(name))[1] in
      (select id::text from public.shops where owner_id = (select auth.uid()))
  );

drop policy if exists "certification_docs_admin_all" on storage.objects;
create policy "certification_docs_admin_all" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'certification-docs'
    and public.is_admin()
  );

-- 3. Table des demandes de certification
create table if not exists public.shop_certifications (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete cascade not null,
  business_doc_url text not null,
  identity_doc_url text not null,
  store_photo_url text not null,
  store_video_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  submitted_at timestamptz default now() not null,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

-- Index pour requêtes fréquentes
create index if not exists idx_shop_certifications_shop_id on public.shop_certifications(shop_id);
create index if not exists idx_shop_certifications_status on public.shop_certifications(status);

-- 4. RLS sur shop_certifications
alter table public.shop_certifications enable row level security;

-- SELECT : Le propriétaire de la boutique peut consulter ses demandes, ou l'administrateur
drop policy if exists "shop_certifications_select_owner_or_admin" on public.shop_certifications;
create policy "shop_certifications_select_owner_or_admin" on public.shop_certifications
  for select
  using (
    shop_id in (select id from public.shops where owner_id = (select auth.uid()))
    or public.is_admin()
  );

-- INSERT : Le propriétaire peut soumettre une demande
drop policy if exists "shop_certifications_insert_owner" on public.shop_certifications;
create policy "shop_certifications_insert_owner" on public.shop_certifications
  for insert
  with check (
    shop_id in (select id from public.shops where owner_id = (select auth.uid()))
  );

-- UPDATE : Réservé exclusivement aux administrateurs
drop policy if exists "shop_certifications_update_admin" on public.shop_certifications;
create policy "shop_certifications_update_admin" on public.shop_certifications
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- 5. RPC Administrateur pour lister les demandes de certification
create or replace function public.admin_list_certifications()
returns table (
  id uuid,
  shop_id uuid,
  shop_name text,
  shop_slug text,
  owner_email text,
  business_doc_url text,
  identity_doc_url text,
  store_photo_url text,
  store_video_url text,
  status text,
  admin_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  is_certified boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur uniquement.';
  end if;

  return query
  select 
    c.id,
    c.shop_id,
    s.name as shop_name,
    s.slug as shop_slug,
    coalesce(u.email::text, 'Inconnu') as owner_email,
    c.business_doc_url,
    c.identity_doc_url,
    c.store_photo_url,
    c.store_video_url,
    c.status,
    c.admin_notes,
    c.submitted_at,
    c.reviewed_at,
    s.is_certified
  from public.shop_certifications c
  join public.shops s on s.id = c.shop_id
  left join auth.users u on u.id = s.owner_id
  order by 
    case when c.status = 'pending' then 0 else 1 end,
    c.submitted_at desc;
end;
$$;

-- 6. RPC Administrateur pour valider ou rejeter une certification
create or replace function public.admin_review_certification(
  p_certification_id uuid,
  p_status text,
  p_admin_notes text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cert public.shop_certifications;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur uniquement.';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Statut invalide. Utilisez approved ou rejected.';
  end if;

  select * into v_cert from public.shop_certifications where id = p_certification_id;
  if not found then
    raise exception 'Demande de certification introuvable.';
  end if;

  update public.shop_certifications
  set status = p_status,
      admin_notes = p_admin_notes,
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  where id = p_certification_id;

  if p_status = 'approved' then
    update public.shops
    set is_certified = true,
        updated_at = now()
    where id = v_cert.shop_id;
  elsif p_status = 'rejected' then
    update public.shops
    set is_certified = false,
        updated_at = now()
    where id = v_cert.shop_id;
  end if;

  return true;
end;
$$;

-- 7. Mise à jour de get_explorer_products pour renvoyer shop_is_certified
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
stable
security definer
set search_path = ''
as $$
begin
  return query
  select 
    p.id as product_id,
    p.name as product_name,
    p.description as product_description,
    p.price as product_price,
    p.discount_percent as product_discount_percent,
    case 
      when cardinality(p.images) > 0 then p.images[1] 
      else null 
    end as product_image_url,
    p.stock as product_stock,
    p.created_at as product_created_at,
    c.id as category_id,
    c.name as category_name,
    s.id as shop_id,
    s.name as shop_name,
    s.slug as shop_slug,
    s.logo_url as shop_logo_url,
    s.is_certified as shop_is_certified
  from public.products p
  join public.shops s on s.id = p.shop_id
  left join public.categories c on c.id = p.category_id
  where s.status = 'active'
    and s.is_listed_in_explorer = true
    and p.is_available = true
    and p.is_hidden = false
    and (
      p_category is null 
      or p_category = '' 
      or (c.name is not null and c.name ilike trim(p_category))
    )
    and (
      p_search is null 
      or p_search = '' 
      or (
        p.name ilike '%' || trim(p_search) || '%'
        or coalesce(p.description, '') ilike '%' || trim(p_search) || '%'
        or s.name ilike '%' || trim(p_search) || '%'
        or coalesce(c.name, '') ilike '%' || trim(p_search) || '%'
      )
    )
  order by 
    case when s.is_certified then 0 else 1 end,
    p.created_at desc
  limit coalesce(p_limit, 60)
  offset coalesce(p_offset, 0);
end;
$$;
