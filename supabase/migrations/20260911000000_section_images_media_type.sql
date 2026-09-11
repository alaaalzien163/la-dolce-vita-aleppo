-- Extend `public.section_images` so one Department carousel can hold both images
-- and videos, while keeping the smallest possible change.
--
-- Deliberately NOT a rename to `section_media`:
--   * `image_url` stays the single media-URL column. Renaming it (or the table)
--     would rewrite every writer, RLS policy, and the admin upload flow for no
--     behavioural gain, and it would risk breaking the existing uploaded media.
--   * One media item = one row, exactly as today. A `media_type` discriminator
--     differs between rows; `poster_url` is nullable and only meaningful for
--     video rows, so image rows are untouched and existing data needs no backfill.
--
-- Each media item remains one row:
--
--   section_id | media_type | image_url (media URL) | poster_url    | display_order
--   -----------|------------|-----------------------|---------------|--------------
--   <id>       | image      | https://...cafe-1.jpg | null          | 1
--   <id>       | image      | https://...cafe-2.jpg | null          | 2
--   <id>       | video      | /videos/departments/...mp4 | https://...poster.jpg | 3

alter table public.section_images
  add column media_type text not null default 'image'
    check (media_type in ('image', 'video')),
  add column poster_url text;

comment on column public.section_images.media_type is
  'Kind of media this row represents: image or video.';
comment on column public.section_images.poster_url is
  'Optional poster image URL for a video row; ignored for image rows.';