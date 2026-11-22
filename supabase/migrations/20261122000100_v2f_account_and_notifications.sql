-- =====================================================================
-- Phase V2-F : Compte Commerçant et Notifications de Commande par E-mail
-- 1. Ajout de has_order_email_notifications à subscription_plans
-- 2. Ajout de order_notifications_enabled à shops
-- 3. Fonction SQL sécurisée delete_user_account() pour suppression propre du compte
-- =====================================================================

-- 1. Droit forfaitaire modifiable en admin (Point 3.b)
alter table public.subscription_plans 
  add column if not exists has_order_email_notifications boolean not null default false;

update public.subscription_plans 
  set has_order_email_notifications = true 
  where id in ('business', 'premium');

-- 2. Préférence commerçant (Point 3.a)
alter table public.shops 
  add column if not exists order_notifications_enabled boolean not null default true;

-- 3. Suppression propre du compte commerçant en cascade (Point 2)
create or replace function public.delete_user_account()
returns void 
language plpgsql 
security definer 
set search_path = '' 
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;
  -- Grâce à la contrainte ON DELETE CASCADE sur shops(owner_id) et toutes les tables filles,
  -- la suppression de l'utilisateur dans auth.users efface proprement la boutique et toutes ses données.
  delete from auth.users where id = v_uid;
end;
$$;
