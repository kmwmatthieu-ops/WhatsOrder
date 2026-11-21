-- =====================================================================
-- WhatsOrder — Migration V2-D :
-- 1. Historique de transactions (paiements multiples par commande)
-- 2. Trigger de recalcul automatique du solde et du statut de paiement
-- 3. Migration sans perte des paiements existants
-- =====================================================================

-- 0. Contrainte unique composite (id, shop_id) sur orders pour les FK composites
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_id_shop_key'
  ) then
    alter table public.orders
      add constraint orders_id_shop_key unique (id, shop_id);
  end if;
end $$;

-- 1. Table de l'historique des transactions de paiement (Ledger)
create table if not exists public.order_payments (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null,
  shop_id         uuid not null references public.shops (id) on delete cascade,
  amount          integer not null check (amount > 0),
  method          public.payment_method not null default 'cash',
  note            text check (char_length(note) <= 200),
  paid_at         timestamptz not null default now(),
  idempotency_key text not null unique default gen_random_uuid()::text,
  created_at      timestamptz not null default now(),
  constraint order_payments_order_shop_fk foreign key (order_id, shop_id)
    references public.orders (id, shop_id) on delete cascade
);

create index if not exists order_payments_order_idx
  on public.order_payments (order_id, paid_at desc);

create index if not exists order_payments_shop_paid_idx
  on public.order_payments (shop_id, paid_at desc);

-- 2. Politiques RLS strictes (uniquement le commerçant propriétaire)
alter table public.order_payments enable row level security;

drop policy if exists order_payments_owner_all on public.order_payments;
create policy order_payments_owner_all on public.order_payments
  for all to authenticated
  using (public.owns_shop(shop_id))
  with check (public.owns_shop(shop_id));

revoke all on public.order_payments from anon;
grant select, insert, delete on public.order_payments to authenticated;

-- 3. Trigger de recalcul automatique de orders (amount_paid, payment_status, payment_method)
create or replace function public.sync_order_payment_summary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid := coalesce(new.order_id, old.order_id);
  v_total integer;
  v_sum integer;
  v_last_method public.payment_method;
  v_new_status public.payment_status;
begin
  select total into v_total
  from public.orders
  where id = v_order_id;

  if not found then
    return null;
  end if;

  select
    coalesce(sum(amount), 0)::integer,
    (array_agg(method order by paid_at desc, created_at desc))[1]
  into v_sum, v_last_method
  from public.order_payments
  where order_id = v_order_id;

  if v_sum <= 0 then
    v_new_status := 'unpaid';
  elsif v_sum < v_total then
    v_new_status := 'partial';
  else
    v_new_status := 'paid';
  end if;

  update public.orders
  set amount_paid    = v_sum,
      payment_status = v_new_status,
      payment_method = v_last_method,
      updated_at     = now()
  where id = v_order_id;

  return null;
end $$;

drop trigger if exists order_payments_sync_summary on public.order_payments;
create trigger order_payments_sync_summary
  after insert or update or delete on public.order_payments
  for each row execute function public.sync_order_payment_summary();

-- 4. Migration des paiements déjà enregistrés sur les commandes existantes
insert into public.order_payments (
  order_id,
  shop_id,
  amount,
  method,
  note,
  paid_at,
  idempotency_key
)
select
  o.id,
  o.shop_id,
  o.amount_paid,
  coalesce(o.payment_method, 'cash'::public.payment_method),
  'Règlement initial migré',
  o.updated_at,
  'legacy-order-payment-' || o.id::text
from public.orders o
where o.amount_paid > 0
  and not exists (
    select 1 from public.order_payments op where op.order_id = o.id
  )
on conflict (idempotency_key) do nothing;
