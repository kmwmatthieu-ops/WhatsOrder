-- =====================================================================
-- WhatsOrder — Row Level Security
-- Principe : un commerçant ne voit / modifie que les lignes de SA boutique.
-- Le public ne lit que les boutiques actives, leurs catégories et produits.
-- Commandes / clients : jamais lisibles publiquement (création via fonction
-- serveur security definer au Bloc 4).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Fonctions d'aide (security definer = pas de récursion RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

create or replace function public.owns_shop(p_shop_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.shops where id = p_shop_id and owner_id = (select auth.uid())
  );
$$;

-- Disponibilité d'un slug (voit aussi les boutiques suspendues).
-- Le slug actuel de l'utilisateur reste "disponible" pour lui (écran Paramètres).
create or replace function public.is_slug_available(p_slug text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_slug ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$'
     and p_slug !~ '--'
     and not public.is_reserved_slug(p_slug)
     and not exists (
       select 1 from public.shops
       where slug = p_slug
         and owner_id <> coalesce((select auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid)
     );
$$;

revoke execute on function public.is_admin()                from public, anon;
revoke execute on function public.owns_shop(uuid)           from public, anon;
revoke execute on function public.is_slug_available(text)   from public, anon;
grant  execute on function public.is_admin()                to authenticated;
grant  execute on function public.owns_shop(uuid)           to authenticated;
grant  execute on function public.is_slug_available(text)   to authenticated;

-- ---------------------------------------------------------------------
-- Garde-fous sur les colonnes sensibles
-- (auth.uid() null = connexion directe postgres / service_role → autorisé)
-- ---------------------------------------------------------------------
-- Un commerçant ne peut ni changer de propriétaire, ni (dé)suspendre sa boutique.
create or replace function public.protect_shop_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    if new.owner_id is distinct from old.owner_id then
      raise exception 'FORBIDDEN_OWNER_CHANGE';
    end if;
    if new.status is distinct from old.status then
      raise exception 'FORBIDDEN_STATUS_CHANGE';
    end if;
  end if;
  return new;
end $$;
create trigger shops_protect before update on public.shops
  for each row execute function public.protect_shop_columns();

-- À la création, une boutique est toujours active (sauf si créée par un admin).
create or replace function public.force_shop_active()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    new.status := 'active';
  end if;
  return new;
end $$;
create trigger shops_force_active before insert on public.shops
  for each row execute function public.force_shop_active();

-- Sur une commande, le commerçant ne modifie que le statut et le paiement.
create or replace function public.protect_order_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and (
       new.shop_id, new.customer_id, new.public_code, new.fulfillment, new.delivery_address,
       new.delivery_fee, new.subtotal, new.total, new.customer_note, new.created_at
     ) is distinct from (
       old.shop_id, old.customer_id, old.public_code, old.fulfillment, old.delivery_address,
       old.delivery_fee, old.subtotal, old.total, old.customer_note, old.created_at
     ) then
    raise exception 'FORBIDDEN_ORDER_FIELDS';
  end if;
  return new;
end $$;
create trigger orders_protect before update on public.orders
  for each row execute function public.protect_order_columns();

-- ---------------------------------------------------------------------
-- Activation RLS partout
-- ---------------------------------------------------------------------
alter table public.admins               enable row level security;
alter table public.shops                enable row level security;
alter table public.categories           enable row level security;
alter table public.products             enable row level security;
alter table public.customers            enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.order_status_history enable row level security;
alter table public.order_rate_limits    enable row level security;
-- admins, order_rate_limits : AUCUNE politique → inaccessibles via l'API.

-- ---------------------------------------------------------------------
-- shops
-- ---------------------------------------------------------------------
create policy shops_public_read on public.shops
  for select to anon, authenticated using (status = 'active');
create policy shops_owner_read on public.shops
  for select to authenticated using (owner_id = (select auth.uid()));
create policy shops_admin_read on public.shops
  for select to authenticated using ((select public.is_admin()));

create policy shops_owner_insert on public.shops
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy shops_owner_update on public.shops
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy shops_admin_update on public.shops
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
-- Pas de DELETE dans le MVP.

-- Le public anonyme ne voit pas owner_id ni les dates : colonnes utiles uniquement.
revoke select on public.shops from anon;
grant select (id, name, slug, logo_url, description, whatsapp_number, primary_color,
              delivery_fee, pickup_enabled, delivery_enabled, address, status)
  on public.shops to anon;

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create policy categories_public_read on public.categories
  for select to anon, authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.status = 'active'));
create policy categories_owner_all on public.categories
  for all to authenticated
  using (public.owns_shop(shop_id)) with check (public.owns_shop(shop_id));

-- ---------------------------------------------------------------------
-- products
-- Le public voit aussi les produits indisponibles (affichés "non commandables").
-- La commande (Bloc 4) refusera côté serveur tout produit indisponible.
-- ---------------------------------------------------------------------
create policy products_public_read on public.products
  for select to anon, authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.status = 'active'));
create policy products_owner_all on public.products
  for all to authenticated
  using (public.owns_shop(shop_id)) with check (public.owns_shop(shop_id));

-- ---------------------------------------------------------------------
-- customers / orders / order_items / order_status_history
-- ---------------------------------------------------------------------
create policy customers_owner_read on public.customers
  for select to authenticated using (public.owns_shop(shop_id));

create policy orders_owner_read on public.orders
  for select to authenticated using (public.owns_shop(shop_id));
create policy orders_owner_update on public.orders
  for update to authenticated
  using (public.owns_shop(shop_id)) with check (public.owns_shop(shop_id));

create policy order_items_owner_read on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o
                 where o.id = order_id and public.owns_shop(o.shop_id)));

create policy order_status_history_owner_read on public.order_status_history
  for select to authenticated
  using (exists (select 1 from public.orders o
                 where o.id = order_id and public.owns_shop(o.shop_id)));
