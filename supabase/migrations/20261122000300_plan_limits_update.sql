-- Mise à jour des quotas des forfaits selon les nouvelles spécifications (V3)
update public.subscription_plans
set max_products = 5,
    max_orders_per_month = 10,
    updated_at = now()
where id = 'gratuit';

update public.subscription_plans
set max_products = 50,
    max_orders_per_month = 100,
    updated_at = now()
where id = 'business';

update public.subscription_plans
set max_products = null,
    max_orders_per_month = null,
    updated_at = now()
where id = 'premium';
