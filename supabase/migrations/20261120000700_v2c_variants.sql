-- =====================================================================
-- WhatsOrder — Migration V2-C : Variantes structurées de produits
-- =====================================================================

-- 1. Table des variantes de produits
create table if not exists public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null,
  shop_id        uuid not null references public.shops (id) on delete cascade,
  label          text not null check (char_length(btrim(label)) between 1 and 120),
  attributes     jsonb not null default '{}'::jsonb,
  price_override integer check (price_override is null or price_override > 0),
  stock          integer check (stock is null or stock >= 0),
  is_available   boolean not null default true,
  position       integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint product_variants_product_shop_fk foreign key (product_id, shop_id)
    references public.products (id, shop_id) on delete cascade
);

create index if not exists product_variants_product_idx
  on public.product_variants (product_id, position, created_at);

create unique index if not exists product_variants_product_label_uidx
  on public.product_variants (product_id, lower(btrim(label)));

drop trigger if exists product_variants_updated_at on public.product_variants;
create trigger product_variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();

-- 2. Politiques RLS sur product_variants
alter table public.product_variants enable row level security;

drop policy if exists product_variants_public_read on public.product_variants;
create policy product_variants_public_read on public.product_variants
  for select to anon, authenticated
  using (exists (
    select 1 from public.shops s
    where s.id = shop_id and s.status = 'active'
  ));

drop policy if exists product_variants_owner_all on public.product_variants;
create policy product_variants_owner_all on public.product_variants
  for all to authenticated
  using (public.owns_shop(shop_id))
  with check (public.owns_shop(shop_id));

grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;

-- 3. Évolution de order_items et order_item_input
alter table public.order_items
  add column if not exists variant_id uuid references public.product_variants (id) on delete set null;

do $$
begin
  alter type public.order_item_input add attribute variant_id uuid;
exception
  when duplicate_column then null;
end $$;

-- 4. Suppression de l'ancienne surcharge à 7 arguments (évite l'ambiguïté PostgREST PGRST203)
drop function if exists public.place_order(
  text, text, text, public.fulfillment_type, text, text, public.order_item_input[]
);

-- 5. Mise à jour de place_order() : recalcul du prix et gestion du stock par variante
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
  v_unit_price integer;
  v_selected_label text;
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

      if not found or not v_variant.is_available then
        raise exception 'VARIANT_UNAVAILABLE: %', v_product.name;
      end if;

      if v_variant.stock is not null then
        if v_variant.stock < v_item.quantity then
          raise exception 'INSUFFICIENT_STOCK: % — % (reste %)', v_product.name, v_variant.label, v_variant.stock;
        end if;
        update public.product_variants
        set stock = stock - v_item.quantity
        where id = v_variant.id;
      end if;

      v_unit_price := coalesce(v_variant.price_override, v_product.price);
      v_selected_label := v_variant.label;
    else
      if v_product.stock is not null then
        if v_product.stock < v_item.quantity then
          raise exception 'INSUFFICIENT_STOCK: % (reste %)', v_product.name, v_product.stock;
        end if;
        update public.products
        set stock = stock - v_item.quantity
        where id = v_product.id;
      end if;

      v_unit_price := v_product.price;
      v_selected_label := v_item.selected_options;
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
      'line_total', v_item_subtotal
    );
  end loop;

  v_total := v_subtotal + v_delivery_fee;

  -- 6. Insertion de la commande
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

  -- 7. Insertion des lignes de commande à partir des montants recalculés
  insert into public.order_items (
    order_id,
    product_id,
    variant_id,
    product_name,
    unit_price,
    quantity,
    selected_options
  )
  select
    v_order_id,
    (elem->>'product_id')::uuid,
    nullif(elem->>'variant_id', '')::uuid,
    elem->>'product_name',
    (elem->>'unit_price')::integer,
    (elem->>'quantity')::integer,
    nullif(elem->>'selected_options', '')
  from jsonb_array_elements(v_items_result) as elem;

  -- 8. Historique initial
  insert into public.order_status_history (order_id, status)
  values (v_order_id, 'new');

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

grant execute on function public.place_order(
  text, text, text, public.fulfillment_type, text, text, public.order_item_input[], uuid
) to anon, authenticated;
