-- =====================================================================
-- Bon Waz à Dealer — Attribution des droits sur les tables publiques
-- =====================================================================
-- Donne accès aux tables aux utilisateurs connectés et au public.
-- La sécurité et l'isolation multi-boutiques restent garanties à 100%
-- par les politiques Row Level Security (RLS) actives sur chaque table.

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;
