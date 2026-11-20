-- =====================================================================
-- WhatsOrder — Schéma de base (MVP)
-- Montants : integer en FCFA (pas de décimales).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.shop_status      as enum ('active', 'suspended');
create type public.order_status     as enum ('new', 'confirmed', 'ready', 'delivered', 'cancelled');
create type public.fulfillment_type as enum ('delivery', 'pickup');
create type public.payment_status   as enum ('unpaid', 'partial', 'paid');
create type public.payment_method   as enum ('cash', 'cash_on_delivery', 'mobile_money');

-- ---------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------
-- Slugs interdits : les boutiques vivent à la racine (/[slug]) et ne doivent
-- pas masquer les routes de l'application. Liste dupliquée dans src/lib/slug.ts.
create or replace function public.is_reserved_slug(p_slug text)
returns boolean language sql immutable set search_path = '' as $$
  select p_slug = any (array[
    'admin','api','auth','connexion','inscription','mot-de-passe-oublie',
    'nouveau-mot-de-passe','onboarding','tableau-de-bord','dashboard','app',
    'login','signup','compte','aide','support','contact','tarifs','cgu',
    'confidentialite','boutique','boutiques','commande','commandes','panier',
    'static','assets','images','favicon','robots','sitemap','www','mail'
  ]);
$$;

-- Plan gratuit : 20 produits. Point unique à faire évoluer en V2 (plans).
create or replace function public.shop_product_limit(p_shop_id uuid)
returns integer language sql immutable set search_path = '' as $$
  select 20;
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- admins : aucune politique RLS → illisible via l'API.
-- Ajouter un admin (SQL editor) : insert into public.admins (user_id) values ('<uuid>');
-- ---------------------------------------------------------------------
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- shops
-- ---------------------------------------------------------------------
create table public.shops (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null unique references auth.users (id) on delete cascade, -- 1 boutique / commerçant
  name             text not null check (char_length(btrim(name)) between 2 and 60),
  slug             text not null unique
                   check (slug ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$'
                          and slug !~ '--'
                          and not public.is_reserved_slug(slug)),
  logo_url         text,
  description      text check (char_length(description) <= 500),
  whatsapp_number  text not null check (whatsapp_number ~ '^\+[1-9][0-9]{7,14}$'), -- E.164
  primary_color    text not null default '#0F766E' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  delivery_fee     integer not null default 0 check (delivery_fee >= 0),
  pickup_enabled   boolean not null default true,
  delivery_enabled boolean not null default true,
  address          text check (char_length(address) <= 200),
  status           public.shop_status not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint shops_one_fulfillment_mode check (pickup_enabled or delivery_enabled)
);
-- owner_id et slug sont déjà indexés par leurs contraintes UNIQUE.
create index shops_status_idx on public.shops (status);

create trigger shops_updated_at before update on public.shops
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  constraint categories_id_shop_key unique (id, shop_id) -- cible des FK composites
);
create unique index categories_shop_name_uidx on public.categories (shop_id, lower(btrim(name)));

-- ---------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops (id) on delete cascade,
  category_id  uuid,
  name         text not null check (char_length(btrim(name)) between 1 and 80),
  description  text check (char_length(description) <= 1000),
  price        integer not null check (price > 0),
  images       text[] not null default '{}' check (cardinality(images) <= 3),
  options_text text check (char_length(options_text) <= 300),
  stock        integer check (stock is null or stock >= 0), -- null = illimité
  is_available boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint products_id_shop_key unique (id, shop_id),
  -- La catégorie doit appartenir à la MÊME boutique.
  -- Suppression d'une catégorie → le produit devient "sans catégorie" (PG15+).
  constraint products_category_fk foreign key (category_id, shop_id)
    references public.categories (id, shop_id) on delete set null (category_id)
);
create index products_shop_created_idx on public.products (shop_id, created_at desc);
create index products_category_idx     on public.products (category_id) where category_id is not null;

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- Limite de produits par boutique (verrou sur la boutique = pas de course).
create or replace function public.enforce_product_limit()
returns trigger language plpgsql set search_path = '' as $$
declare v_count integer;
begin
  perform 1 from public.shops where id = new.shop_id for update;
  select count(*) into v_count from public.products where shop_id = new.shop_id;
  if v_count >= public.shop_product_limit(new.shop_id) then
    raise exception 'PRODUCT_LIMIT_REACHED' using errcode = 'P0001',
      hint = 'Limite du plan gratuit atteinte';
  end if;
  return new;
end $$;

create trigger products_limit before insert on public.products
  for each row execute function public.enforce_product_limit();

-- ---------------------------------------------------------------------
-- customers (créés / mis à jour par place_order() — Bloc 4)
-- ---------------------------------------------------------------------
create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 80),
  phone      text not null check (phone ~ '^\+?[0-9]{8,15}$'),
  address    text check (char_length(address) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_shop_phone_key unique (shop_id, phone),
  constraint customers_id_shop_key    unique (id, shop_id)
);

create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  shop_id          uuid not null references public.shops (id) on delete cascade,
  customer_id      uuid not null,
  public_code      text not null unique check (public_code ~ '^CMD-[A-HJ-NP-Z2-9]{4,6}$'), -- sans 0/O/1/I
  status           public.order_status not null default 'new',
  fulfillment      public.fulfillment_type not null,
  delivery_address text check (char_length(delivery_address) <= 300),
  delivery_fee     integer not null default 0 check (delivery_fee >= 0),
  subtotal         integer not null check (subtotal >= 0),
  total            integer not null,
  payment_status   public.payment_status not null default 'unpaid',
  payment_method   public.payment_method,
  amount_paid      integer not null default 0 check (amount_paid >= 0),
  customer_note    text check (char_length(customer_note) <= 500),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint orders_total_ok       check (total = subtotal + delivery_fee),
  constraint orders_address_needed check (fulfillment = 'pickup' or delivery_address is not null),
  constraint orders_customer_fk foreign key (customer_id, shop_id)
    references public.customers (id, shop_id) on delete restrict
);
create index orders_shop_created_idx on public.orders (shop_id, created_at desc);
create index orders_shop_status_idx  on public.orders (shop_id, status);
create index orders_customer_idx     on public.orders (customer_id);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- order_items (copie figée du nom et du prix au moment de la commande)
-- ---------------------------------------------------------------------
create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  product_id       uuid references public.products (id) on delete set null,
  product_name     text not null,
  unit_price       integer not null check (unit_price >= 0),
  quantity         integer not null check (quantity between 1 and 999),
  selected_options text check (char_length(selected_options) <= 300)
);
create index order_items_order_idx   on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id) where product_id is not null;

-- ---------------------------------------------------------------------
-- order_status_history (alimentée automatiquement par trigger)
-- ---------------------------------------------------------------------
create table public.order_status_history (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  status     public.order_status not null,
  changed_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, changed_at);

-- security definer : le commerçant n'a pas le droit d'écrire l'historique lui-même.
create or replace function public.log_order_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status) values (new.id, new.status);
  end if;
  return new;
end $$;

create trigger orders_status_history after insert or update of status on public.orders
  for each row execute function public.log_order_status();

-- ---------------------------------------------------------------------
-- Anti-spam des commandes (utilisée par place_order() — Bloc 4, sans SaaS externe)
-- ---------------------------------------------------------------------
create table public.order_rate_limits (
  bucket       text primary key,          -- ex. 'ip:1.2.3.4' ou 'phone:+225...'
  hits         integer not null default 0,
  window_start timestamptz not null default now()
);
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

-- Droits de base sur le schéma et les tables (la sécurité et l'isolation sont assurées par les RLS ci-dessous)
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;

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
-- =====================================================================
-- WhatsOrder — Stockage des images
-- Bucket public en lecture (URL directes + cache CDN), écriture restreinte
-- au dossier de SA boutique.
-- Chemins : {shop_id}/logo/{uuid}.webp   et   {shop_id}/products/{uuid}.webp
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-media', 'shop-media', true, 2097152, array['image/webp']) -- 2 Mo, WebP uniquement
on conflict (id) do nothing;

create policy shop_media_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shop-media'
    and (storage.foldername(name))[1] in
      (select id::text from public.shops where owner_id = (select auth.uid()))
  );

create policy shop_media_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shop-media'
    and (storage.foldername(name))[1] in
      (select id::text from public.shops where owner_id = (select auth.uid()))
  );

create policy shop_media_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shop-media'
    and (storage.foldername(name))[1] in
      (select id::text from public.shops where owner_id = (select auth.uid()))
  );
-- Pas de politique SELECT : impossible de lister les fichiers des autres boutiques
-- (la lecture publique passe par l'URL publique du bucket).
-- =====================================================================
-- WhatsOrder — Migration 4 : Fonction transactionnelle de commande
-- Sécurité : recalcul strict des prix côté serveur, décrémentation atomique
-- du stock, création/mise à jour du client, génération du code lisible unique.
-- =====================================================================

create or replace function public.generate_public_order_code()
returns text language plpgsql set search_path = '' as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sans 0, O, 1, I
  code text;
  i integer;
begin
  loop
    code := 'CMD-';
    for i in 1..4 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    end loop;
    exit when not exists (select 1 from public.orders where public_code = code);
  end loop;
  return code;
end $$;

-- Type d'entrée pour les articles de la commande
create type public.order_item_input as (
  product_id       uuid,
  quantity         integer,
  selected_options text
);

create or replace function public.place_order(
  p_shop_slug        text,
  p_customer_name    text,
  p_customer_phone   text,
  p_fulfillment      public.fulfillment_type,
  p_delivery_address text,
  p_customer_note    text,
  p_items            public.order_item_input[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop public.shops%rowtype;
  v_customer_id uuid;
  v_order_id uuid;
  v_public_code text;
  v_subtotal integer := 0;
  v_delivery_fee integer := 0;
  v_total integer := 0;
  v_item public.order_item_input;
  v_product public.products%rowtype;
  v_item_subtotal integer;
  v_items_result jsonb := '[]'::jsonb;
begin
  -- 1. Vérification de la boutique
  select * into v_shop from public.shops where slug = p_shop_slug;
  if not found then
    raise exception 'SHOP_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_shop.status <> 'active' then
    raise exception 'SHOP_NOT_ACTIVE' using errcode = 'P0003';
  end if;

  -- 2. Vérification du mode de commande (livraison ou retrait)
  if p_fulfillment = 'delivery' then
    if not v_shop.delivery_enabled then
      raise exception 'DELIVERY_NOT_AVAILABLE';
    end if;
    if p_delivery_address is null or char_length(btrim(p_delivery_address)) < 2 then
      raise exception 'DELIVERY_ADDRESS_REQUIRED';
    end if;
    v_delivery_fee := v_shop.delivery_fee;
  elsif p_fulfillment = 'pickup' then
    if not v_shop.pickup_enabled then
      raise exception 'PICKUP_NOT_AVAILABLE';
    end if;
  else
    raise exception 'INVALID_FULFILLMENT';
  end if;

  -- 3. Vérification des articles
  if p_items is null or cardinality(p_items) = 0 then
    raise exception 'EMPTY_ORDER_ITEMS';
  end if;

  -- 4. Traitement et vérification des prix/stocks pour chaque article (verrouillé FOR UPDATE)
  foreach v_item in array p_items loop
    if v_item.quantity <= 0 or v_item.quantity > 999 then
      raise exception 'INVALID_QUANTITY';
    end if;

    select * into v_product
    from public.products
    where id = v_item.product_id and shop_id = v_shop.id
    for update;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    if not v_product.is_available then
      raise exception 'PRODUCT_UNAVAILABLE: %', v_product.name;
    end if;

    if v_product.stock is not null then
      if v_product.stock < v_item.quantity then
        raise exception 'INSUFFICIENT_STOCK: % (reste %)', v_product.name, v_product.stock;
      end if;
      -- Décrémentation du stock
      update public.products
      set stock = stock - v_item.quantity
      where id = v_product.id;
    end if;

    v_item_subtotal := v_product.price * v_item.quantity;
    v_subtotal := v_subtotal + v_item_subtotal;
  end loop;

  v_total := v_subtotal + v_delivery_fee;

  -- 5. Création ou mise à jour automatique du client (par shop_id + téléphone)
  insert into public.customers (shop_id, name, phone, address)
  values (v_shop.id, btrim(p_customer_name), btrim(p_customer_phone), p_delivery_address)
  on conflict (shop_id, phone) do update
  set name = excluded.name,
      address = coalesce(excluded.address, public.customers.address),
      updated_at = now()
  returning id into v_customer_id;

  -- 6. Génération du code commande
  v_public_code := public.generate_public_order_code();

  -- 7. Création de la commande
  insert into public.orders (
    shop_id,
    customer_id,
    public_code,
    status,
    fulfillment,
    delivery_address,
    delivery_fee,
    subtotal,
    total,
    customer_note
  ) values (
    v_shop.id,
    v_customer_id,
    v_public_code,
    'new',
    p_fulfillment,
    p_delivery_address,
    v_delivery_fee,
    v_subtotal,
    v_total,
    p_customer_note
  ) returning id into v_order_id;

  -- 8. Création des lignes de commande (prix et nom figés)
  foreach v_item in array p_items loop
    select * into v_product from public.products where id = v_item.product_id;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      unit_price,
      quantity,
      selected_options
    ) values (
      v_order_id,
      v_product.id,
      v_product.name,
      v_product.price,
      v_item.quantity,
      v_item.selected_options
    );

    v_items_result := v_items_result || jsonb_build_object(
      'product_name', v_product.name,
      'unit_price', v_product.price,
      'quantity', v_item.quantity,
      'selected_options', v_item.selected_options
    );
  end loop;

  -- 9. Résultat structuré pour la confirmation et le message WhatsApp
  return jsonb_build_object(
    'order_id', v_order_id,
    'public_code', v_public_code,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'total', v_total,
    'fulfillment', p_fulfillment,
    'delivery_address', p_delivery_address,
    'customer_note', p_customer_note,
    'customer_name', btrim(p_customer_name),
    'customer_phone', btrim(p_customer_phone),
    'shop_name', v_shop.name,
    'shop_whatsapp', v_shop.whatsapp_number,
    'items', v_items_result
  );
end $$;

-- Autoriser l'appel pour les visiteurs publics (anonymes) et connectés
grant execute on function public.place_order(
  text, text, text, public.fulfillment_type, text, text, public.order_item_input[]
) to anon, authenticated;
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
