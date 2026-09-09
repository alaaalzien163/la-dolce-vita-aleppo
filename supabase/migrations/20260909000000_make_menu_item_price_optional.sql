-- Menu item pricing is optional: NULL means that no price was specified.
ALTER TABLE public.menu_items
  ALTER COLUMN price DROP NOT NULL;

-- Down migration (only after backfilling NULL prices to a valid value):
-- ALTER TABLE public.menu_items
--   ALTER COLUMN price SET NOT NULL;
