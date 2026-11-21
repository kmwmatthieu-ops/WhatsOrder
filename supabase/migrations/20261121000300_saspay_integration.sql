-- =====================================================================
-- Migration : Intégration SasPay pour les paiements en ligne d'abonnements
-- 1. Élargissement du champ payment_method de subscription_requests ('saspay')
-- 2. Table saspay_payments pour le suivi idempotent des paiements et webhooks
-- =====================================================================

-- 1. Élargissement de la contrainte payment_method
alter table public.subscription_requests 
  drop constraint if exists subscription_requests_payment_method_check;

alter table public.subscription_requests 
  add constraint subscription_requests_payment_method_check 
  check (payment_method in ('wave', 'orange_money', 'mtn_momo', 'moov_money', 'saspay'));

-- 2. Table saspay_payments pour tracer l'intégralité du cycle de vie des paiements SasPay
create table if not exists public.saspay_payments (
  id                   uuid primary key default gen_random_uuid(),
  shop_id              uuid not null references public.shops(id) on delete cascade,
  user_id              uuid references auth.users(id),
  plan_id              text not null references public.subscription_plans(id),
  duration_months      integer not null check (duration_months in (1, 3, 6, 12)),
  amount               text not null, -- Format décimal chaîne : "5000.00"
  currency             text not null default 'XOF',
  saspay_session_id    text,          -- ID checkout session
  saspay_payment_id    text,          -- ID transaction payment vérifié
  checkout_url         text,          -- URL de paiement hébergée
  status               text not null default 'PENDING' check (status in ('PENDING', 'SUCCESS', 'FAILED')),
  net_amount           text,          -- Montant net reversé
  debited_amount       text,          -- Montant débité au payeur
  idempotency_key      text unique,   -- UUID d'idempotence unique
  metadata             jsonb default '{}'::jsonb,
  delivered_at         timestamptz,   -- Date d'activation de l'abonnement (garantie d'unicité)
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- RLS sur saspay_payments
alter table public.saspay_payments enable row level security;

create policy "Commerçants peuvent lire leurs paiements SasPay"
  on public.saspay_payments for select
  using (
    exists (
      select 1 from public.shops s
      where s.id = saspay_payments.shop_id
      and s.owner_id = auth.uid()
    )
  );

create policy "Admins peuvent tout lire sur saspay_payments"
  on public.saspay_payments for all
  using (
    exists (
      select 1 from public.admins a
      where a.user_id = auth.uid()
    )
  );

create index if not exists saspay_payments_shop_idx on public.saspay_payments (shop_id, status);
create index if not exists saspay_payments_session_idx on public.saspay_payments (saspay_session_id);
create index if not exists saspay_payments_payment_idx on public.saspay_payments (saspay_payment_id);
