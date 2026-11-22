-- =====================================================================
-- Migration V3-C : Gestion manuelle des forfaits & certification par l'Admin
-- =====================================================================

-- 1. Débrider les types MIME du bucket certification-docs pour accepter tout document / test
update storage.buckets
set allowed_mime_types = null,
    file_size_limit = 52428800
where id = 'certification-docs';

-- 2. Politiques RLS sur storage.objects pour le bucket certification-docs
drop policy if exists "certification_docs_owner_insert" on storage.objects;
drop policy if exists "certification_docs_owner_all" on storage.objects;
create policy "certification_docs_owner_all" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'certification-docs'
    and (storage.foldername(name))[1] in
      (select id::text from public.shops where owner_id = (select auth.uid()))
  )
  with check (
    bucket_id = 'certification-docs'
    and (storage.foldername(name))[1] in
      (select id::text from public.shops where owner_id = (select auth.uid()))
  );

-- 3. Mise à jour de admin_list_shops avec informations d'abonnement et certification
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
  is_certified boolean,
  plan_id text,
  plan_name text,
  subscription_status text,
  subscription_expires_at timestamptz,
  subscription_notes text
)
language plpgsql
security definer
set search_path = ''
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
    s.is_certified,
    coalesce(sub.plan_id, 'gratuit') as plan_id,
    coalesce(p.name, 'Gratuit') as plan_name,
    coalesce(sub.status::text, 'active') as subscription_status,
    sub.expires_at as subscription_expires_at,
    sub.notes as subscription_notes
  from public.shops s
  left join auth.users u on u.id = s.owner_id
  left join public.orders o on o.shop_id = s.id
  left join public.shop_subscriptions sub on sub.shop_id = s.id
  left join public.subscription_plans p on p.id = sub.plan_id
  group by s.id, u.email, s.is_certified, sub.plan_id, p.name, sub.status, sub.expires_at, sub.notes
  order by s.created_at desc;
end $$;

grant execute on function public.admin_list_shops() to authenticated;

-- 4. RPC admin_assign_subscription (attribuer un forfait à n'importe quel commerçant)
create or replace function public.admin_assign_subscription(
  p_shop_id uuid,
  p_plan_id text,
  p_duration_months integer default null,
  p_notes text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expires_at timestamptz := null;
  v_plan public.subscription_plans%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur uniquement.';
  end if;

  select * into v_plan from public.subscription_plans where id = p_plan_id;
  if not found then
    raise exception 'Plan de souscription inconnu : %', p_plan_id;
  end if;

  if p_plan_id <> 'gratuit' and p_duration_months is not null and p_duration_months > 0 then
    v_expires_at := now() + (p_duration_months || ' months')::interval;
  end if;

  insert into public.shop_subscriptions (
    shop_id,
    plan_id,
    status,
    starts_at,
    expires_at,
    notes,
    updated_at
  )
  values (
    p_shop_id,
    p_plan_id,
    'active',
    now(),
    v_expires_at,
    coalesce(p_notes, 'Attribué manuellement par admin le ' || to_char(now(), 'DD/MM/YYYY')),
    now()
  )
  on conflict (shop_id) do update set
    plan_id = excluded.plan_id,
    status = 'active',
    starts_at = now(),
    expires_at = excluded.expires_at,
    notes = excluded.notes,
    updated_at = now();

  return true;
end;
$$;

grant execute on function public.admin_assign_subscription(uuid, text, integer, text) to authenticated;

-- 5. RPC admin_cancel_subscription (résilier le forfait et basculer en Gratuit sans toucher à la certification)
create or replace function public.admin_cancel_subscription(
  p_shop_id uuid,
  p_notes text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur uniquement.';
  end if;

  insert into public.shop_subscriptions (
    shop_id,
    plan_id,
    status,
    starts_at,
    expires_at,
    notes,
    updated_at
  )
  values (
    p_shop_id,
    'gratuit',
    'expired',
    now(),
    null,
    coalesce(p_notes, 'Résilé par admin le ' || to_char(now(), 'DD/MM/YYYY')),
    now()
  )
  on conflict (shop_id) do update set
    plan_id = 'gratuit',
    status = 'expired',
    expires_at = null,
    notes = excluded.notes,
    updated_at = now();

  return true;
end;
$$;

grant execute on function public.admin_cancel_subscription(uuid, text) to authenticated;

-- 6. RPC admin_toggle_certification (accorder ou retirer la certification d'une boutique)
create or replace function public.admin_toggle_certification(
  p_shop_id uuid,
  p_is_certified boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur uniquement.';
  end if;

  update public.shops
  set is_certified = p_is_certified,
      updated_at = now()
  where id = p_shop_id;

  if not found then
    raise exception 'Boutique introuvable.';
  end if;

  return true;
end;
$$;

grant execute on function public.admin_toggle_certification(uuid, boolean) to authenticated;
