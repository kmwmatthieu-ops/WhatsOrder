-- =====================================================================
-- WhatsOrder — Migration : Augmentation limite de photos produits (3 -> 5)
-- =====================================================================

do $$
declare
  r record;
begin
  for r in (
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where t.relname = 'products' and pg_get_constraintdef(c.oid) like '%cardinality(images)%'
  ) loop
    execute 'alter table public.products drop constraint ' || quote_ident(r.conname);
  end loop;
end $$;

alter table public.products
  add constraint products_images_check check (cardinality(images) <= 5);
