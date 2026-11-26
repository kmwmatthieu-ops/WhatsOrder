-- Migration: Correctif du garde-fou consécutif dans Explorer
-- Évite que la boucle d'affichage s'arrête prématurément à 2 produits
-- lorsqu'il n'y a pas d'autre boutique pour alterner.

-- 1. get_explorer_products
create or replace function public.get_explorer_products(
  p_search text default null,
  p_category text default null,
  p_limit integer default 60,
  p_offset integer default 0
)
returns table (
  product_id uuid,
  product_name text,
  product_description text,
  product_price integer,
  product_discount_percent integer,
  product_image_url text,
  product_stock integer,
  product_created_at timestamptz,
  category_id uuid,
  category_name text,
  shop_id uuid,
  shop_name text,
  shop_slug text,
  shop_logo_url text,
  shop_is_certified boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_search text;
  v_category text;
  v_max_fetch integer;
  v_last_shop_id uuid := null;
  v_second_last_shop_id uuid := null;
  v_count integer := 0;
  v_cand record;
  v_found boolean;
begin
  v_search := nullif(trim(p_search), '');
  v_category := nullif(trim(p_category), '');
  v_max_fetch := coalesce(p_limit, 60) + coalesce(p_offset, 0);

  create temp table if not exists tmp_explorer_cand (
    product_id uuid primary key,
    product_name text,
    product_description text,
    product_price integer,
    product_discount_percent integer,
    product_image_url text,
    product_stock integer,
    product_created_at timestamptz,
    category_id uuid,
    category_name text,
    shop_id uuid,
    shop_name text,
    shop_slug text,
    shop_logo_url text,
    shop_is_certified boolean,
    raw_score numeric,
    is_out_of_stock integer,
    picked boolean default false
  ) on commit drop;

  truncate tmp_explorer_cand;

  insert into tmp_explorer_cand (
    product_id, product_name, product_description, product_price, product_discount_percent,
    product_image_url, product_stock, product_created_at, category_id, category_name,
    shop_id, shop_name, shop_slug, shop_logo_url, shop_is_certified, raw_score, is_out_of_stock
  )
  select 
    subq.product_id,
    subq.product_name,
    subq.product_description,
    subq.product_price,
    subq.product_discount_percent,
    subq.product_image_url,
    subq.product_stock,
    subq.product_created_at,
    subq.category_id,
    subq.category_name,
    subq.shop_id,
    subq.shop_name,
    subq.shop_slug,
    subq.shop_logo_url,
    subq.shop_is_certified,
    subq.raw_score,
    subq.is_out_of_stock
  from (
    select 
      p.id as product_id,
      p.name as product_name,
      p.description as product_description,
      p.price as product_price,
      coalesce(p.discount_percent, 0) as product_discount_percent,
      case when cardinality(p.images) > 0 then p.images[1] else null end as product_image_url,
      p.stock as product_stock,
      p.created_at as product_created_at,
      c.id as category_id,
      c.name as category_name,
      s.id as shop_id,
      s.name as shop_name,
      s.slug as shop_slug,
      s.logo_url as shop_logo_url,
      case 
        when s.identity_verified = true 
         and coalesce(sp.has_certified_badge, false) = true 
         and coalesce(sub.status::text, '') = 'active'
         and (sub.expires_at is null or sub.expires_at > now()) 
        then true 
        else false 
      end as shop_is_certified,
      (
        case
          when v_search is null then 100
          when lower(p.name) = lower(v_search) then 500
          when p.name ilike v_search || '%' then 400
          when p.name ilike '%' || v_search || '%' then 300
          when c.name ilike '%' || v_search || '%' or s.name ilike '%' || v_search || '%' then 200
          when coalesce(p.description, '') ilike '%' || v_search || '%' then 100
          else 0
        end * 1000.0
        +
        (
          (100.0 / (1.0 + extract(epoch from (now() - p.created_at)) / 86400.0))
          *
          case 
            when coalesce(sub.status::text, '') = 'active'
             and (sub.expires_at is null or sub.expires_at > now()) 
            then coalesce(sp.visibility_multiplier, 1.0) 
            else 1.0 
          end
        )
      ) as raw_score,
      case when p.stock is null or p.stock > 0 then 0 else 1 end as is_out_of_stock
    from public.products p
    join public.shops s on s.id = p.shop_id
    left join public.categories c on c.id = p.category_id
    left join public.shop_subscriptions sub on sub.shop_id = s.id
    left join public.subscription_plans sp on sp.id = coalesce(sub.plan_id, 'gratuit')
    where s.status = 'active'
      and s.is_listed_in_explorer = true
      and p.is_available = true
      and p.is_hidden = false
      and cardinality(p.images) > 0
      and (
        v_category is null 
        or v_category = 'all'
        or (c.name is not null and c.name ilike v_category)
        or c.id::text = v_category
      )
      and (
        v_search is null 
        or p.name ilike '%' || v_search || '%'
        or coalesce(p.description, '') ilike '%' || v_search || '%'
        or s.name ilike '%' || v_search || '%'
        or coalesce(c.name, '') ilike '%' || v_search || '%'
      )
  ) subq
  order by 
    subq.is_out_of_stock asc,
    subq.raw_score desc,
    subq.product_created_at desc
  limit 250;

  create temp table if not exists tmp_explorer_res (
    seq_order serial primary key,
    product_id uuid,
    product_name text,
    product_description text,
    product_price integer,
    product_discount_percent integer,
    product_image_url text,
    product_stock integer,
    product_created_at timestamptz,
    category_id uuid,
    category_name text,
    shop_id uuid,
    shop_name text,
    shop_slug text,
    shop_logo_url text,
    shop_is_certified boolean
  ) on commit drop;

  truncate tmp_explorer_res;

  loop
    exit when v_count >= v_max_fetch;

    v_found := false;

    -- Si les 2 derniers produits sont de la même boutique, chercher en priorité une autre boutique
    if v_last_shop_id is not null and v_second_last_shop_id is not null and v_last_shop_id = v_second_last_shop_id then
      select * into v_cand
      from tmp_explorer_cand c
      where not c.picked and c.shop_id <> v_last_shop_id
      order by c.is_out_of_stock asc, c.raw_score desc, c.product_created_at desc
      limit 1;

      if found then
        v_found := true;
      else
        -- S'il n'y a plus d'autre boutique pour alterner, on n'arrête pas le catalogue prématurément !
        v_found := false;
      end if;
    end if;

    if not v_found then
      select * into v_cand
      from tmp_explorer_cand c
      where not c.picked
      order by c.is_out_of_stock asc, c.raw_score desc, c.product_created_at desc
      limit 1;

      if not found then
        exit;
      end if;
    end if;

    update tmp_explorer_cand c set picked = true where c.product_id = v_cand.product_id;

    insert into tmp_explorer_res (
      product_id, product_name, product_description, product_price, product_discount_percent,
      product_image_url, product_stock, product_created_at, category_id, category_name,
      shop_id, shop_name, shop_slug, shop_logo_url, shop_is_certified
    ) values (
      v_cand.product_id, v_cand.product_name, v_cand.product_description, v_cand.product_price, v_cand.product_discount_percent,
      v_cand.product_image_url, v_cand.product_stock, v_cand.product_created_at, v_cand.category_id, v_cand.category_name,
      v_cand.shop_id, v_cand.shop_name, v_cand.shop_slug, v_cand.shop_logo_url, v_cand.shop_is_certified
    );

    v_second_last_shop_id := v_last_shop_id;
    v_last_shop_id := v_cand.shop_id;
    v_count := v_count + 1;
  end loop;

  return query
  select 
    r.product_id, r.product_name, r.product_description, r.product_price, r.product_discount_percent,
    r.product_image_url, r.product_stock, r.product_created_at, r.category_id, r.category_name,
    r.shop_id, r.shop_name, r.shop_slug, r.shop_logo_url, r.shop_is_certified
  from tmp_explorer_res r
  order by r.seq_order asc
  offset coalesce(p_offset, 0)
  limit coalesce(p_limit, 60);
end;
$$;

grant execute on function public.get_explorer_products(text, text, integer, integer) to anon, authenticated, service_role;


-- 2. get_for_you_products
create or replace function public.get_for_you_products(
  p_limit integer default 60,
  p_offset integer default 0
)
returns table (
  product_id uuid,
  product_name text,
  product_description text,
  product_price integer,
  product_discount_percent integer,
  product_image_url text,
  product_stock integer,
  product_created_at timestamptz,
  category_id uuid,
  category_name text,
  shop_id uuid,
  shop_name text,
  shop_slug text,
  shop_logo_url text,
  shop_primary_color text,
  shop_is_certified boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_user_id uuid;
  v_consent boolean := true;
  v_max_fetch integer;
  v_last_shop_id uuid := null;
  v_second_last_shop_id uuid := null;
  v_count integer := 0;
  v_cand record;
  v_found boolean;
begin
  v_user_id := auth.uid();
  v_max_fetch := coalesce(p_limit, 60) + coalesce(p_offset, 0);

  if v_user_id is not null then
    select personalization_consent into v_consent
    from public.user_preferences
    where user_id = v_user_id;
    if v_consent is null then
      v_consent := true;
    end if;
  else
    v_consent := false;
  end if;

  create temp table if not exists tmp_for_you_cand (
    product_id uuid primary key,
    product_name text,
    product_description text,
    product_price integer,
    product_discount_percent integer,
    product_image_url text,
    product_stock integer,
    product_created_at timestamptz,
    category_id uuid,
    category_name text,
    shop_id uuid,
    shop_name text,
    shop_slug text,
    shop_logo_url text,
    shop_primary_color text,
    shop_is_certified boolean,
    raw_score numeric,
    is_out_of_stock integer,
    picked boolean default false
  ) on commit drop;

  truncate tmp_for_you_cand;

  insert into tmp_for_you_cand (
    product_id, product_name, product_description, product_price, product_discount_percent,
    product_image_url, product_stock, product_created_at, category_id, category_name,
    shop_id, shop_name, shop_slug, shop_logo_url, shop_primary_color, shop_is_certified,
    raw_score, is_out_of_stock
  )
  select
    subq.product_id,
    subq.product_name,
    subq.product_description,
    subq.product_price,
    subq.product_discount_percent,
    subq.product_image_url,
    subq.product_stock,
    subq.product_created_at,
    subq.category_id,
    subq.category_name,
    subq.shop_id,
    subq.shop_name,
    subq.shop_slug,
    subq.shop_logo_url,
    subq.shop_primary_color,
    subq.shop_is_certified,
    subq.final_score as raw_score,
    subq.is_out_of_stock
  from (
    select
      p.id as product_id,
      p.name as product_name,
      p.description as product_description,
      p.price as product_price,
      coalesce(p.discount_percent, 0) as product_discount_percent,
      case when cardinality(p.images) > 0 then p.images[1] else null end as product_image_url,
      p.stock as product_stock,
      p.created_at as product_created_at,
      c.id as category_id,
      c.name as category_name,
      s.id as shop_id,
      s.name as shop_name,
      s.slug as shop_slug,
      s.logo_url as shop_logo_url,
      s.primary_color as shop_primary_color,
      case
        when s.identity_verified = true
         and coalesce(sp.has_certified_badge, false) = true
         and coalesce(sub.status::text, '') = 'active'
         and (sub.expires_at is null or sub.expires_at > now())
        then true
        else false
      end as shop_is_certified,
      (
        (100.0 / (1.0 + extract(epoch from (now() - p.created_at)) / 86400.0))
        *
        case
          when coalesce(sub.status::text, '') = 'active'
           and (sub.expires_at is null or sub.expires_at > now())
          then coalesce(sp.visibility_multiplier, 1.0)
          else 1.0
        end
        +
        case when v_user_id is not null and v_consent = true and f.shop_id is not null then 80.0 else 0.0 end
        +
        case when v_user_id is not null and v_consent = true and cp.category_id is not null then coalesce(cp.weight, 0) * 15.0 else 0.0 end
      ) as final_score,
      case when p.stock is null or p.stock > 0 then 0 else 1 end as is_out_of_stock
    from public.products p
    join public.shops s on s.id = p.shop_id
    left join public.categories c on c.id = p.category_id
    left join public.shop_subscriptions sub on sub.shop_id = s.id
    left join public.subscription_plans sp on sp.id = coalesce(sub.plan_id, 'gratuit')
    left join public.shop_followers f on f.shop_id = s.id and f.user_id = v_user_id
    left join (
      select category_id, count(*)::numeric as weight
      from public.customer_activities
      where user_id = v_user_id
        and category_id is not null
        and created_at > now() - interval '30 days'
      group by category_id
    ) cp on cp.category_id = c.id
    where s.status = 'active'
      and s.is_listed_in_explorer = true
      and p.is_available = true
      and p.is_hidden = false
      and cardinality(p.images) > 0
  ) subq
  order by
    subq.is_out_of_stock asc,
    subq.final_score desc,
    subq.product_created_at desc
  limit 250;

  create temp table if not exists tmp_for_you_res (
    seq_order serial primary key,
    product_id uuid,
    product_name text,
    product_description text,
    product_price integer,
    product_discount_percent integer,
    product_image_url text,
    product_stock integer,
    product_created_at timestamptz,
    category_id uuid,
    category_name text,
    shop_id uuid,
    shop_name text,
    shop_slug text,
    shop_logo_url text,
    shop_primary_color text,
    shop_is_certified boolean
  ) on commit drop;

  truncate tmp_for_you_res;

  loop
    exit when v_count >= v_max_fetch;

    v_found := false;

    if v_last_shop_id is not null and v_second_last_shop_id is not null and v_last_shop_id = v_second_last_shop_id then
      select * into v_cand
      from tmp_for_you_cand c
      where not c.picked and c.shop_id <> v_last_shop_id
      order by c.is_out_of_stock asc, c.raw_score desc, c.product_created_at desc
      limit 1;

      if found then
        v_found := true;
      else
        -- S'il n'y a plus d'autre boutique pour alterner, on n'arrête pas le catalogue prématurément !
        v_found := false;
      end if;
    end if;

    if not v_found then
      select * into v_cand
      from tmp_for_you_cand c
      where not c.picked
      order by c.is_out_of_stock asc, c.raw_score desc, c.product_created_at desc
      limit 1;

      if not found then
        exit;
      end if;
    end if;

    update tmp_for_you_cand c set picked = true where c.product_id = v_cand.product_id;

    insert into tmp_for_you_res (
      product_id, product_name, product_description, product_price, product_discount_percent,
      product_image_url, product_stock, product_created_at, category_id, category_name,
      shop_id, shop_name, shop_slug, shop_logo_url, shop_primary_color, shop_is_certified
    ) values (
      v_cand.product_id, v_cand.product_name, v_cand.product_description, v_cand.product_price, v_cand.product_discount_percent,
      v_cand.product_image_url, v_cand.product_stock, v_cand.product_created_at, v_cand.category_id, v_cand.category_name,
      v_cand.shop_id, v_cand.shop_name, v_cand.shop_slug, v_cand.shop_logo_url, v_cand.shop_primary_color, v_cand.shop_is_certified
    );

    v_second_last_shop_id := v_last_shop_id;
    v_last_shop_id := v_cand.shop_id;
    v_count := v_count + 1;
  end loop;

  return query
  select 
    r.product_id, r.product_name, r.product_description, r.product_price, r.product_discount_percent,
    r.product_image_url, r.product_stock, r.product_created_at, r.category_id, r.category_name,
    r.shop_id, r.shop_name, r.shop_slug, r.shop_logo_url, r.shop_primary_color, r.shop_is_certified
  from tmp_for_you_res r
  order by r.seq_order asc
  offset coalesce(p_offset, 0)
  limit coalesce(p_limit, 60);
end;
$$;

grant execute on function public.get_for_you_products(integer, integer) to anon, authenticated, service_role;
