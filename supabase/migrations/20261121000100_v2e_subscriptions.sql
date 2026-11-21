-- =====================================================================
-- Phase V2-E : Modèle Économique, Abonnements et Tarifs
-- 1. Table subscription_plans (catalogue paramétrable des offres)
-- 2. Table shop_subscriptions (abonnement actif et validité par boutique)
-- 3. Table subscription_requests (demandes de paiement Mobile Money manuel)
-- 4. Fonctions SQL dynamiques (limite produits, limite commandes mensuelles)
-- 5. Évolution de place_order() avec contrôle du quota mensuel
-- 6. Politiques RLS et gestion de l'expiration sans perte de données
-- =====================================================================

-- 1. Types ENUM
do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum ('active', 'expired', 'past_due');
  end if;
  if not exists (select 1 from pg_type where typname = 'subscription_request_status') then
    create type public.subscription_request_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

-- 2. Table des plans d'abonnement (paramétrable sans redéploiement)
create table if not exists public.subscription_plans (
  id                   text primary key,               -- 'gratuit', 'business', 'premium'
  name                 text not null,                  -- 'Gratuit', 'Business', 'Premium'
  description          text not null,
  price_monthly        integer not null default 0,     -- en FCFA
  max_products         integer,                        -- 20, 100, null = illimité
  max_orders_per_month integer,                        -- 50, 300, null = illimité
  has_advanced_stats   boolean not null default false,
  has_csv_export       boolean not null default false,
  badge                text,                           -- 'Découverte', 'Populaire', 'Illimité'
  is_active            boolean not null default true,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Peuple les 3 plans par défaut s'ils n'existent pas
insert into public.subscription_plans 
  (id, name, description, price_monthly, max_products, max_orders_per_month, has_advanced_stats, has_csv_export, badge, is_active, sort_order)
values
  ('gratuit', 'Gratuit', 'Idéal pour démarrer et tester votre boutique en ligne sur WhatsApp.', 0, 20, 50, false, false, 'Découverte', true, 1),
  ('business', 'Business', 'Pour les commerçants actifs : catalogue élargi, statistiques et export.', 5000, 100, 300, true, true, 'Populaire', true, 2),
  ('premium', 'Premium', 'Pour les boutiques à fort volume : zéro limite et fonctionnalités complètes.', 12000, null, null, true, true, 'Illimité', true, 3)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_monthly = excluded.price_monthly,
  max_products = excluded.max_products,
  max_orders_per_month = excluded.max_orders_per_month,
  has_advanced_stats = excluded.has_advanced_stats,
  has_csv_export = excluded.has_csv_export,
  badge = excluded.badge,
  sort_order = excluded.sort_order;

-- 3. Table des abonnements par boutique
create table if not exists public.shop_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null unique references public.shops(id) on delete cascade,
  plan_id     text not null references public.subscription_plans(id) default 'gratuit',
  status      public.subscription_status not null default 'active',
  starts_at   timestamptz not null default now(),
  expires_at  timestamptz,                              -- null pour le plan gratuit
  notes       text check (char_length(notes) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Rétrocompatibilité : attribuer le plan gratuit à toutes les boutiques existantes
insert into public.shop_subscriptions (shop_id, plan_id, status)
select id, 'gratuit', 'active'
from public.shops
on conflict (shop_id) do nothing;

-- Trigger : auto-attribuer l'abonnement gratuit lors de la création d'une boutique
create or replace function public.handle_new_shop_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.shop_subscriptions (shop_id, plan_id, status)
  values (new.id, 'gratuit', 'active')
  on conflict (shop_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_shop_created_subscription on public.shops;
create trigger on_shop_created_subscription
  after insert on public.shops
  for each row execute function public.handle_new_shop_subscription();

-- 4. Table des demandes de changement de plan (Paiement manuel Mobile Money)
create table if not exists public.subscription_requests (
  id                     uuid primary key default gen_random_uuid(),
  shop_id                uuid not null references public.shops(id) on delete cascade,
  requested_plan_id      text not null references public.subscription_plans(id),
  duration_months        integer not null default 1 check (duration_months in (1, 3, 6, 12)),
  amount_due             integer not null check (amount_due >= 0),
  payment_method         text not null check (payment_method in ('wave', 'orange_money', 'mtn_momo', 'moov_money')),
  sender_phone           text not null check (char_length(btrim(sender_phone)) >= 8),
  transaction_reference  text check (transaction_reference is null or char_length(transaction_reference) <= 100),
  status                 public.subscription_request_status not null default 'pending',
  admin_notes            text check (char_length(admin_notes) <= 500),
  reviewed_by            uuid references auth.users(id),
  reviewed_at            timestamptz,
  created_at             timestamptz not null default now()
);

create index if not exists sub_req_shop_idx on public.subscription_requests (shop_id, status, created_at desc);

-- 5. Fonctions SQL dynamiques

-- A. Résolution du plan actif d'une boutique (prend en compte l'expiration sans suppression)
create or replace function public.get_active_shop_plan(p_shop_id uuid)
returns public.subscription_plans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.shop_subscriptions%rowtype;
  v_plan public.subscription_plans%rowtype;
begin
  select * into v_sub from public.shop_subscriptions where shop_id = p_shop_id;

  -- Si aucun abonnement ou plan gratuit, renvoyer gratuit
  if not found or v_sub.plan_id = 'gratuit' then
    select * into v_plan from public.subscription_plans where id = 'gratuit';
    return v_plan;
  end if;

  -- Si l'abonnement payant est expiré
  if v_sub.expires_at is not null and v_sub.expires_at < now() then
    -- Met à jour le statut en expired si ce n'est pas déjà fait
    if v_sub.status <> 'expired' then
      update public.shop_subscriptions
      set status = 'expired', updated_at = now()
      where shop_id = p_shop_id;
    end if;
    -- Règle non-destructive : retour automatique sous les limites du plan gratuit
    select * into v_plan from public.subscription_plans where id = 'gratuit';
    return v_plan;
  end if;

  -- Plan payant actif
  select * into v_plan from public.subscription_plans where id = v_sub.plan_id and is_active = true;
  if not found then
    select * into v_plan from public.subscription_plans where id = 'gratuit';
  end if;

  return v_plan;
end;
$$;

-- B. Limite de produits dynamique (remplace la valeur fixe 20 de la V1)
create or replace function public.shop_product_limit(p_shop_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_plan public.subscription_plans;
begin
  v_plan := public.get_active_shop_plan(p_shop_id);
  if v_plan.max_products is null then
    return 999999; -- Illimité
  end if;
  return v_plan.max_products;
end;
$$;

-- C. Limite de commandes mensuelles dynamique
create or replace function public.shop_monthly_orders_limit(p_shop_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_plan public.subscription_plans;
begin
  v_plan := public.get_active_shop_plan(p_shop_id);
  if v_plan.max_orders_per_month is null then
    return 999999; -- Illimité
  end if;
  return v_plan.max_orders_per_month;
end;
$$;

-- D. Nombre de commandes passées durant le mois calendaire en cours
create or replace function public.shop_monthly_orders_count(p_shop_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.orders
  where shop_id = p_shop_id
    and created_at >= date_trunc('month', now());
$$;

-- 6. Mise à jour de place_order() pour intégrer le contrôle du quota mensuel de commandes
create or replace function public.place_order(
  p_shop_slug         text,
  p_customer_name     text,
  p_customer_phone    text,
  p_fulfillment       public.fulfillment_type,
  p_delivery_address  text,
  p_customer_note     text,
  p_items             public.order_item_input[],
  p_delivery_zone_id  uuid default null
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
  v_delivery_zone_name text := null;
  v_total integer := 0;
  v_item public.order_item_input;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_has_variants boolean;
  v_base_price integer;
  v_unit_price integer;
  v_selected_label text;
  v_item_subtotal integer;
  v_items_result jsonb := '[]'::jsonb;
  v_monthly_orders integer;
  v_monthly_limit integer;
begin
  -- 1. Vérification de la boutique
  select * into v_shop from public.shops where slug = p_shop_slug;
  if not found then
    raise exception 'SHOP_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_shop.status <> 'active' then
    raise exception 'SHOP_NOT_ACTIVE' using errcode = 'P0003';
  end if;

  -- 1.bis Vérification du quota mensuel de commandes de la boutique (V2-E)
  v_monthly_orders := public.shop_monthly_orders_count(v_shop.id);
  v_monthly_limit  := public.shop_monthly_orders_limit(v_shop.id);

  if v_monthly_orders >= v_monthly_limit then
    raise exception 'MONTHLY_ORDER_LIMIT_REACHED' using errcode = 'P0001',
      hint = 'Quota mensuel de commandes atteint pour cette boutique';
  end if;

  -- 2. Vérification du mode de commande
  if p_fulfillment = 'delivery' then
    if not v_shop.delivery_enabled then
      raise exception 'DELIVERY_NOT_AVAILABLE';
    end if;
    if p_delivery_address is null or char_length(btrim(p_delivery_address)) < 2 then
      raise exception 'DELIVERY_ADDRESS_REQUIRED';
    end if;

    if p_delivery_zone_id is not null then
      select name, fee into v_delivery_zone_name, v_delivery_fee
      from public.delivery_zones
      where id = p_delivery_zone_id and shop_id = v_shop.id;

      if not found then
        raise exception 'INVALID_DELIVERY_ZONE';
      end if;
    else
      if exists (select 1 from public.delivery_zones where shop_id = v_shop.id) then
        raise exception 'DELIVERY_ZONE_REQUIRED';
      end if;
      v_delivery_fee := v_shop.delivery_fee;
    end if;
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

  -- 4. Création ou mise à jour du client
  insert into public.customers (shop_id, name, phone, address)
  values (v_shop.id, btrim(p_customer_name), btrim(p_customer_phone), p_delivery_address)
  on conflict (shop_id, phone) do update
  set name = excluded.name,
      address = coalesce(excluded.address, public.customers.address),
      updated_at = now()
  returning id into v_customer_id;

  v_public_code := public.generate_public_order_code();

  -- 5. Pré-calcul, verrouillage et décrémentation des stocks (produit ou variante)
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

    select exists (
      select 1 from public.product_variants where product_id = v_product.id
    ) into v_has_variants;

    if v_has_variants then
      if v_item.variant_id is null then
        raise exception 'VARIANT_REQUIRED: %', v_product.name;
      end if;

      select * into v_variant
      from public.product_variants
      where id = v_item.variant_id
        and product_id = v_product.id
        and shop_id = v_shop.id
      for update;

      if not found then
        raise exception 'VARIANT_NOT_FOUND';
      end if;

      v_base_price := coalesce(v_variant.price_override, v_product.price);
      v_selected_label := v_variant.label;

      if v_variant.stock is not null then
        if v_variant.stock < v_item.quantity then
          raise exception 'INSUFFICIENT_STOCK: % — % (reste %)', v_product.name, v_variant.label, v_variant.stock;
        end if;
        update public.product_variants
        set stock = stock - v_item.quantity, updated_at = now()
        where id = v_variant.id;
      end if;
    else
      v_base_price := v_product.price;
      v_selected_label := coalesce(v_item.selected_options, '');

      if v_product.stock is not null then
        if v_product.stock < v_item.quantity then
          raise exception 'INSUFFICIENT_STOCK: % (reste %)', v_product.name, v_product.stock;
        end if;
        update public.products
        set stock = stock - v_item.quantity, updated_at = now()
        where id = v_product.id;
      end if;
    end if;

    -- Application de la réduction en % du produit si définie (> 0)
    if coalesce(v_product.discount_percent, 0) > 0 then
      v_unit_price := greatest(
        1,
        round(v_base_price::numeric * (100 - v_product.discount_percent)::numeric / 100.0)::integer
      );
    else
      v_unit_price := v_base_price;
    end if;

    v_item_subtotal := v_unit_price * v_item.quantity;
    v_subtotal := v_subtotal + v_item_subtotal;

    v_items_result := v_items_result || jsonb_build_object(
      'product_id', v_product.id,
      'variant_id', case when v_has_variants then v_variant.id else null end,
      'product_name', v_product.name,
      'unit_price', v_unit_price,
      'quantity', v_item.quantity,
      'selected_options', v_selected_label,
      'subtotal', v_item_subtotal
    );
  end loop;

  v_total := v_subtotal + v_delivery_fee;

  -- 6. Insertion de la commande
  insert into public.orders (
    shop_id, customer_id, public_code, status, fulfillment,
    delivery_address, delivery_fee, subtotal, total,
    payment_status, payment_method, amount_paid, customer_note
  )
  values (
    v_shop.id, v_customer_id, v_public_code, 'new', p_fulfillment,
    p_delivery_address, v_delivery_fee, v_subtotal, v_total,
    'unpaid', 'cash', 0, p_customer_note
  )
  returning id into v_order_id;

  -- 7. Insertion des articles de la commande
  insert into public.order_items (
    order_id, product_id, variant_id, product_name, unit_price, quantity, selected_options
  )
  select
    v_order_id,
    (x->>'product_id')::uuid,
    (x->>'variant_id')::uuid,
    x->>'product_name',
    (x->>'unit_price')::integer,
    (x->>'quantity')::integer,
    nullif(x->>'selected_options', '')
  from jsonb_array_elements(v_items_result) as x;

  -- 8. Historique initial du statut
  insert into public.order_status_history (order_id, status)
  values (v_order_id, 'new');

  return jsonb_build_object(
    'order_id', v_order_id,
    'public_code', v_public_code,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'delivery_zone', v_delivery_zone_name,
    'total', v_total,
    'customer_name', p_customer_name,
    'customer_phone', p_customer_phone,
    'whatsapp_number', v_shop.whatsapp_number,
    'shop_name', v_shop.name,
    'fulfillment', p_fulfillment,
    'items', v_items_result
  );
end;
$$;

-- 7. Politiques RLS (Row Level Security)

-- A. Table subscription_plans
alter table public.subscription_plans enable row level security;

drop policy if exists subscription_plans_public_read on public.subscription_plans;
create policy subscription_plans_public_read on public.subscription_plans
  for select to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists subscription_plans_admin_all on public.subscription_plans;
create policy subscription_plans_admin_all on public.subscription_plans
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.subscription_plans to anon, authenticated;
grant all on public.subscription_plans to authenticated;

-- B. Table shop_subscriptions
alter table public.shop_subscriptions enable row level security;

drop policy if exists shop_subscriptions_owner_read on public.shop_subscriptions;
create policy shop_subscriptions_owner_read on public.shop_subscriptions
  for select to authenticated
  using (public.owns_shop(shop_id) or public.is_admin());

drop policy if exists shop_subscriptions_admin_all on public.shop_subscriptions;
create policy shop_subscriptions_admin_all on public.shop_subscriptions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.shop_subscriptions to authenticated;
grant all on public.shop_subscriptions to authenticated;

-- C. Table subscription_requests
alter table public.subscription_requests enable row level security;

drop policy if exists subscription_requests_owner_read on public.subscription_requests;
create policy subscription_requests_owner_read on public.subscription_requests
  for select to authenticated
  using (public.owns_shop(shop_id) or public.is_admin());

drop policy if exists subscription_requests_owner_insert on public.subscription_requests;
create policy subscription_requests_owner_insert on public.subscription_requests
  for insert to authenticated
  with check (public.owns_shop(shop_id));

drop policy if exists subscription_requests_admin_all on public.subscription_requests;
create policy subscription_requests_admin_all on public.subscription_requests
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert on public.subscription_requests to authenticated;
grant all on public.subscription_requests to authenticated;
