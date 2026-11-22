-- =====================================================================
-- Migration V3-E : Statistiques Comptables Administrateur, Utilisateurs
-- et RLS d'analyse globale de la plateforme
-- =====================================================================

-- 1. Politiques RLS pour permettre à l'administrateur d'analyser les commandes et l'activité
drop policy if exists orders_admin_select on public.orders;
create policy orders_admin_select on public.orders
  for select to authenticated
  using (public.is_admin());

drop policy if exists customer_activity_admin_select on public.customer_activity;
create policy customer_activity_admin_select on public.customer_activity
  for select to authenticated
  using (public.is_admin());

-- 2. RPC admin_get_users_stats : Comptage exhaustif des utilisateurs de la plateforme
create or replace function public.admin_get_users_stats()
returns table (
  total_users integer,
  merchants_count integer,
  clients_count integer,
  active_users_30d integer
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur uniquement.';
  end if;

  return query
  select 
    (select count(*)::integer from auth.users) as total_users,
    (select count(distinct owner_id)::integer from public.shops) as merchants_count,
    (select count(*)::integer from public.customer_profiles) as clients_count,
    (select count(distinct uid)::integer from (
      select customer_id as uid from public.customer_activity where created_at >= (now() - interval '30 days')
      union
      select customer_id as uid from public.orders where created_at >= (now() - interval '30 days')
      union
      select s.owner_id as uid from public.shops s where s.updated_at >= (now() - interval '30 days')
    ) u) as active_users_30d;
end;
$$;

grant execute on function public.admin_get_users_stats() to authenticated, service_role;

-- 3. RPC admin_get_accounting_timeline : Chronologie détaillée pour le diagramme en courbe
create or replace function public.admin_get_accounting_timeline()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res jsonb;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur uniquement.';
  end if;

  select jsonb_build_object(
    'orders', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'total', o.total,
          'amount_paid', coalesce(o.amount_paid, 0),
          'status', o.status,
          'customer_id', o.customer_id,
          'created_at', o.created_at
        ) order by o.created_at asc
      ) from public.orders o
    ), '[]'::jsonb),
    'activities', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ca.id,
          'activity_type', ca.activity_type,
          'customer_id', ca.customer_id,
          'created_at', ca.created_at
        ) order by ca.created_at asc
      ) from public.customer_activity ca
    ), '[]'::jsonb),
    'subscriptions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', sr.id,
          'amount_due', sr.amount_due,
          'requested_plan_id', sr.requested_plan_id,
          'status', sr.status,
          'created_at', sr.created_at
        ) order by sr.created_at asc
      ) from public.subscription_requests sr
      where sr.status = 'approved'
    ), '[]'::jsonb)
  ) into v_res;

  return v_res;
end;
$$;

grant execute on function public.admin_get_accounting_timeline() to authenticated, service_role;
