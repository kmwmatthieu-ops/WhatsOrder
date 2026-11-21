-- =====================================================================
-- WhatsOrder — Migration : Suppression de boutique (V2)
-- Autorise le propriétaire ou un administrateur à supprimer sa boutique.
-- Les tables enfants (produits, variantes, catégories, clients, commandes,
-- règlements, zones) sont supprimées en cascade grâce aux FK on delete cascade.
-- =====================================================================

-- 1. Politique RLS permettant au commerçant propriétaire de supprimer sa boutique
create policy shops_owner_delete on public.shops
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- 2. Politique RLS permettant à l'administrateur de supprimer une boutique
create policy shops_admin_delete on public.shops
  for delete to authenticated
  using ((select public.is_admin()));

-- Recharger le cache de schéma PostgREST
notify pgrst, 'reload schema';
