-- Remove the retired Gallery feature without touching unrelated application data.
--
-- The bucket deletion is intentionally guarded: if any object exists, the
-- migration raises instead of silently deleting user media. The application audit
-- found zero Gallery rows and zero objects before this migration was prepared.

do $$
begin
  if exists (
    select 1
    from storage.objects
    where bucket_id = 'gallery-images'
  ) then
    raise exception
      'Refusing to remove gallery-images: the bucket still contains objects';
  end if;
end
$$;

-- Remove only policies whose predicates or checks are scoped to this bucket.
-- Policy names are not assumed because they were created outside repository
-- migrations; predicates are inspected instead, leaving unrelated policies intact.
do $$
declare
  policy record;
begin
  for policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename in ('objects', 'buckets')
      and (
        coalesce(qual, '') ilike '%gallery-images%'
        or coalesce(with_check, '') ilike '%gallery-images%'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy.policyname,
      policy.schemaname,
      policy.tablename
    );
  end loop;
end
$$;

-- Drops the table's indexes, RLS policies, and
-- gallery_images_section_id_fkey together with the table.
drop table if exists public.gallery_images;
