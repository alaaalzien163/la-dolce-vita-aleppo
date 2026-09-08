-- Prevent orphaned gallery objects in the `gallery-images` bucket.
--
-- `gallery_images.section_id` was declared `on delete cascade`: deleting a section
-- silently deleted its gallery rows while the matching objects stayed behind in
-- Storage forever. The apps that manage these tables are deliberately separate -
-- Sections CRUD never deletes gallery rows and Gallery CRUD never deletes sections -
-- so the constraint now refuses a section delete while gallery rows still reference
-- it, instead of dissolving those references.
--
-- The Sections admin surfaces a `23503` violation on this constraint as a dedicated
-- "deleteInUse" message telling the admin to remove or reassign the gallery images
-- first. Nothing here drops rows, deletes storage objects, or removes any other
-- foreign key; the table is altered in place, not recreated. `restrict` is used
-- deliberately: unlike `on delete no action`, it is never affected by deferred
-- constraint settings, so the refusal is immediate and deterministic.
--
-- Apply via: supabase db push  (or run in the Supabase SQL editor)

alter table public.gallery_images
  drop constraint gallery_images_section_id_fkey,
  add constraint gallery_images_section_id_fkey
    foreign key (section_id) references public.sections (id)
    on delete restrict;