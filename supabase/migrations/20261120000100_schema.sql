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
