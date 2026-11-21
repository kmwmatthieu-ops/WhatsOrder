-- Migration: Gestion des administrateurs (max 2) et fonctions sécurisées
-- ---------------------------------------------------------------------

-- 1. Lister les administrateurs avec leur email (réservé aux admins)
create or replace function public.admin_list_admins()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select a.user_id, u.email::text, a.created_at
  from public.admins a
  join auth.users u on u.id = a.user_id
  order by a.created_at asc;
end;
$$;

-- 2. Ajouter un administrateur par email (max 2 administrateurs)
create or replace function public.admin_add_admin_by_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_count integer;
  v_target_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Quota maximal strict de 2 administrateurs
  select count(*) into v_admin_count from public.admins;
  if v_admin_count >= 2 then
    return jsonb_build_object('ok', false, 'error', 'Le quota maximal de 2 administrateurs est déjà atteint. Supprimez un accès avant d''en ajouter un nouveau.');
  end if;

  -- Recherche de l'utilisateur dans auth.users
  select id into v_target_user_id
  from auth.users
  where lower(email) = lower(btrim(p_email));

  if v_target_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'Aucun compte trouvé avec cette adresse email sur la plateforme.');
  end if;

  -- Vérifier s'il est déjà admin
  if exists (select 1 from public.admins where user_id = v_target_user_id) then
    return jsonb_build_object('ok', false, 'error', 'Cette adresse email est déjà administrateur.');
  end if;

  insert into public.admins (user_id)
  values (v_target_user_id);

  return jsonb_build_object('ok', true, 'user_id', v_target_user_id);
end;
$$;

-- 3. Révoquer un administrateur (garantit qu'il reste au moins 1 admin)
create or replace function public.admin_remove_admin(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_count integer;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Interdiction formelle de supprimer le dernier admin
  select count(*) into v_admin_count from public.admins;
  if v_admin_count <= 1 then
    return jsonb_build_object('ok', false, 'error', 'Opération impossible : il doit toujours rester au moins un administrateur.');
  end if;

  delete from public.admins where user_id = p_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- Permissions d'exécution
revoke execute on function public.admin_list_admins() from public, anon;
grant  execute on function public.admin_list_admins() to authenticated;

revoke execute on function public.admin_add_admin_by_email(text) from public, anon;
grant  execute on function public.admin_add_admin_by_email(text) to authenticated;

revoke execute on function public.admin_remove_admin(uuid) from public, anon;
grant  execute on function public.admin_remove_admin(uuid) to authenticated;
