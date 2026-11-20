-- =====================================================================
-- WhatsOrder — Migration 5 : Fonctions d'administration
-- =====================================================================

create or replace function public.admin_list_shops()
returns table (
  id uuid,
  name text,
  slug text,
  owner_id uuid,
  owner_email text,
  status public.shop_status,
  created_at timestamptz,
  orders_count bigint
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
    count(o.id) as orders_count
  from public.shops s
  left join auth.users u on u.id = s.owner_id
  left join public.orders o on o.shop_id = s.id
  group by s.id, u.email
  order by s.created_at desc;
end $$;

grant execute on function public.admin_list_shops() to authenticated;
