import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { type QueryResult, toQueryResult } from "@/lib/supabase/result";
import type { PublicStudioInfo } from "@/types/content";

/**
 * Read access to `public.studio_info` - the About band's content singleton.
 *
 * Public read is safe: an anon SELECT probe returns HTTP 200 (a valid public
 * SELECT policy exists), and the query itself only ever filters to published
 * rows. There is no admin CRUD for this table yet, so the only rows a visitor
 * can ever see are ones published directly in the database.
 *
 * The table is a singleton, enforced upstream by `singleton_key`. As with
 * `site_settings`, the query does not filter on that value: `limit(1)` expresses
 * the same intent without hardcoding a magic number.
 *
 * Rendered fields are deliberately narrow (see `PublicStudioInfo`):
 * `title`, `short_description`, `description`, and `hero_image_url`. Contact and
 * social columns exist on the table but no section displays them, so they are not
 * surfaced. `is_active`, `created_at`, and `updated_at` stay out entirely.
 */

const STUDIO_INFO_COLUMNS = "id, title, short_description, description, hero_image_url" as const;

/** Blank strings are treated as absent so the UI need only check for null. */
function orNull(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Public About content, or `empty` when the table has no row a visitor can see.
 *
 * `maybeSingle()` rather than `single()` for the same reason as `site_settings`:
 * zero visible rows is an unpublished section, not a database failure.
 *
 * A row whose `title` is blank is treated as empty rather than returned. Without a
 * title there is nothing to put in the section heading slot, and rendering a
 * heading from thinner data would be a content problem, not a graceful state.
 */
export async function getPublicStudioInfo(): Promise<QueryResult<PublicStudioInfo>> {
  const supabase = getSupabaseServerClient();

  const response = await supabase
    .from("studio_info")
    .select(STUDIO_INFO_COLUMNS)
    .eq("is_active", true)
    .limit(1);

  const result = toQueryResult(
    "studio_info.getPublicStudioInfo",
    response,
    (rows) => rows.length === 0,
  );

  if (result.status !== "success") {
    return result;
  }

  const row = result.data[0];

  // `noUncheckedIndexedAccess` is on, and rightly so: the emptiness predicate above
  // is not visible to the compiler as a narrowing of index access.
  if (!row) {
    return { status: "empty" };
  }

  const title = orNull(row.title);

  if (!title) {
    console.warn("[data] studio_info.getPublicStudioInfo: row has no usable title");
    return { status: "empty" };
  }

  return {
    status: "success",
    data: {
      id: row.id,
      title,
      shortDescription: orNull(row.short_description),
      description: orNull(row.description),
      heroImageUrl: orNull(row.hero_image_url),
    },
  };
}
