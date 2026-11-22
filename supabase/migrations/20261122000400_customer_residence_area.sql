-- =====================================================================
-- Migration V3-C1 : Ajout de la zone de résidence au profil client
-- Permet aux clients d'enregistrer leur quartier/ville par défaut
-- =====================================================================

alter table public.customer_profiles 
  add column if not exists residence_area text;
