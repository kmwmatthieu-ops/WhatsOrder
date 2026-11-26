-- Migration: Mise à jour des multiplicateurs de visibilité Explorer
-- Gratuit : x1.5 (visibilité standard)
-- Business : x2.5 (visibilité renforcée)
-- Premium : x3.5 (visibilité maximale)

update public.subscription_plans set visibility_multiplier = 1.5 where id = 'gratuit';
update public.subscription_plans set visibility_multiplier = 2.5 where id = 'business';
update public.subscription_plans set visibility_multiplier = 3.5 where id = 'premium';
