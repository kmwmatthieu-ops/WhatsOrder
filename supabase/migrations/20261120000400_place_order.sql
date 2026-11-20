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
