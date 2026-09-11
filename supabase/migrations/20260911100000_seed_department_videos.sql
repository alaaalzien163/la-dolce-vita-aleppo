-- Seed department video records.
--
-- Each department gets two video rows in `section_images` referencing the local
-- public assets under `public/videos/departments/{slug}/video-01.mp4` etc.
--
-- Idempotent: safe to run multiple times (existing rows are skipped).
--
-- display_order 1 and 2 place the videos AFTER any existing images (which are
-- order 0), giving the default carousel sequence: images first, then videos.

do $$
declare
  cafe_id       uuid;
  casa_id       uuid;
  sway_id       uuid;
  max_order     int;
begin
  -- Look up each department's section id by slug.
  select id into cafe_id       from public.sections where slug = 'cafe';
  select id into casa_id       from public.sections where slug = 'casa-alla-moda';
  select id into sway_id       from public.sections where slug = 'the-sway-studio';

  if cafe_id is null or casa_id is null or sway_id is null then
    raise warning 'One or more department slugs not found (cafe, casa-alla-moda, the-sway-studio). Video rows not inserted.';
    return;
  end if;

  -- Compute a display_order base so videos land after existing images.
  select coalesce(max(display_order), 0) + 1 into max_order from public.section_images;

  -- La Dolce Vita (DB slug: 'cafe', folder: 'la-dolce-vita')
  insert into public.section_images (section_id, image_url, media_type, poster_url, display_order, is_active)
  select cafe_id, v.path, 'video', null, v.ord, true
  from (values
    ('/videos/departments/la-dolce-vita/video-01.mp4', max_order),
    ('/videos/departments/la-dolce-vita/video-02.mp4', max_order + 1)
  ) as v(path, ord)
  where not exists (
    select 1 from public.section_images x
    where x.section_id = cafe_id and x.image_url = v.path
  );

  -- Casa Alla Moda
  insert into public.section_images (section_id, image_url, media_type, poster_url, display_order, is_active)
  select casa_id, v.path, 'video', null, v.ord, true
  from (values
    ('/videos/departments/casa-alla-moda/video-01.mp4', max_order),
    ('/videos/departments/casa-alla-moda/video-02.mp4', max_order + 1)
  ) as v(path, ord)
  where not exists (
    select 1 from public.section_images x
    where x.section_id = casa_id and x.image_url = v.path
  );

  -- The Sway Studio
  insert into public.section_images (section_id, image_url, media_type, poster_url, display_order, is_active)
  select sway_id, v.path, 'video', null, v.ord, true
  from (values
    ('/videos/departments/the-sway-studio/video-01.mp4', max_order),
    ('/videos/departments/the-sway-studio/video-02.mp4', max_order + 1)
  ) as v(path, ord)
  where not exists (
    select 1 from public.section_images x
    where x.section_id = sway_id and x.image_url = v.path
  );
end
$$;
