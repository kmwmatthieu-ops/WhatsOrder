-- =====================================================================
-- WhatsOrder — Migration V2-B :
-- 1. Statuts "preparing" et "delivering"
-- 2. Zones de livraison multiples
-- 3. Bannière et Horaires d'ouverture
-- 4. Notes internes clients
-- 5. Mise à jour de place_order()
-- =====================================================================

-- 1. Nouveaux Statuts de commande
alter type public.order_status add value if not exists 'preparing' after 'confirmed';
alter type public.order_status add value if not exists 'delivering' after 'ready';

-- 2. Zones de livraison multiples
create table if not exists public.delivery_zones (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  fee        integer not null default 0 check (fee >= 0),
  created_at timestamptz not null default now()
);

create unique index if not exists delivery_zones_shop_name_uidx 
  on public.delivery_zones (shop_id, lower(btrim(name)));

alter table public.delivery_zones enable row level security;

drop policy if exists delivery_zones_public_read on public.delivery_zones;
create policy delivery_zones_public_read on public.delivery_zones
  for select to anon, authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.status = 'active'));

drop policy if exists delivery_zones_owner_all on public.delivery_zones;
create policy delivery_zones_owner_all on public.delivery_zones
  for all to authenticated
  using (public.owns_shop(shop_id))
  with check (public.owns_shop(shop_id));

alter table public.orders 
  add column if not exists delivery_zone_id uuid references public.delivery_zones (id) on delete set null,
  add column if not exists delivery_zone_name text;

-- 3. Bannière et Horaires d'ouverture
alter table public.shops 
  add column if not exists banner_url text,
  add column if not exists opening_hours jsonb not null default '{
    "monday":    { "open": true,  "start": "08:00", "end": "19:00" },
    "tuesday":   { "open": true,  "start": "08:00", "end": "19:00" },
    "wednesday": { "open": true,  "start": "08:00", "end": "19:00" },
    "thursday":  { "open": true,  "start": "08:00", "end": "19:00" },
    "friday":    { "open": true,  "start": "08:00", "end": "19:00" },
    "saturday":  { "open": true,  "start": "09:00", "end": "18:00" },
    "sunday":    { "open": false, "start": "09:00", "end": "18:00" }
  }'::jsonb;

grant select (id, name, slug, logo_url, banner_url, description, whatsapp_number, primary_color,
              delivery_fee, pickup_enabled, delivery_enabled, address, status, opening_hours)
  on public.shops to anon;

-- 4. Notes internes clients
alter table public.customers 
  add column if not exists notes text check (char_length(notes) <= 2000);

drop policy if exists customers_owner_update on public.customers;
create policy customers_owner_update on public.customers
  for update to authenticated
  using (public.owns_shop(shop_id))
  with check (public.owns_shop(shop_id));

-- 5. Mise à jour de place_order()
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

    -- Gestion des zones de livraison
    if p_delivery_zone_id is not null then
      select name, fee into v_delivery_zone_name, v_delivery_fee
      from public.delivery_zones
      where id = p_delivery_zone_id and shop_id = v_shop.id;

      if not found then
        raise exception 'INVALID_DELIVERY_ZONE';
      end if;
    else
      -- Si le commerçant a configuré des zones, le client doit en choisir une
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
    delivery_zone_id,
    delivery_zone_name,
    subtotal,
    total,
    customer_note
  )
  values (
    v_shop.id,
    v_customer_id,
    v_public_code,
    'new',
    p_fulfillment,
    case when p_fulfillment = 'delivery' then p_delivery_address else null end,
    v_delivery_fee,
    p_delivery_zone_id,
    v_delivery_zone_name,
    v_subtotal,
    v_total,
    p_customer_note
  )
  returning id into v_order_id;

  -- 8. Création des lignes de commande (order_items)
  foreach v_item in array p_items loop
    select * into v_product from public.products where id = v_item.product_id;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      unit_price,
      quantity,
      selected_options
    )
    values (
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
      'selected_options', v_item.selected_options,
      'line_total', v_product.price * v_item.quantity
    );
  end loop;

  -- 9. Historique initial (statut 'new')
  insert into public.order_status_history (order_id, status)
  values (v_order_id, 'new');

  -- 10. Résultat complet retourné au serveur
  return jsonb_build_object(
    'order_id', v_order_id,
    'public_code', v_public_code,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'delivery_zone_name', v_delivery_zone_name,
    'total', v_total,
    'whatsapp_number', v_shop.whatsapp_number,
    'items', v_items_result
  );
end $$;
