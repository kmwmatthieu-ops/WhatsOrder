-- =====================================================================
-- WhatsOrder — Stockage des images
-- Bucket public en lecture (URL directes + cache CDN), écriture restreinte
-- au dossier de SA boutique.
-- Chemins : {shop_id}/logo/{uuid}.webp   et   {shop_id}/products/{uuid}.webp
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-media', 'shop-media', true, 2097152, array['image/webp']) -- 2 Mo, WebP uniquement
on conflict (id) do nothing;

create policy shop_media_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shop-media'
    and (storage.foldername(name))[1] in
      (select id::text from public.shops where owner_id = (select auth.uid()))
  );

create policy shop_media_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shop-media'
    and (storage.foldername(name))[1] in
      (select id::text from public.shops where owner_id = (select auth.uid()))
  );

create policy shop_media_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shop-media'
    and (storage.foldername(name))[1] in
      (select id::text from public.shops where owner_id = (select auth.uid()))
  );
-- Pas de politique SELECT : impossible de lister les fichiers des autres boutiques
-- (la lecture publique passe par l'URL publique du bucket).
