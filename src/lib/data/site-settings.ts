import "server-only";

import { cache } from "react";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { type QueryResult, toQueryResult } from "@/lib/supabase/result";
import type { SiteSettings } from "@/types/content";

/**
 * Read access to `public.site_settings` - the contact details the public site shows.
 *
 * The table is a singleton, enforced upstream by `singleton_key` (value 1 in the one
 * published row). The query does not filter on it: doing so would hardcode a
 * magic number and, if the key convention ever changed, silently return nothing
 * instead of failing visibly. `limit(1)` expresses the same intent without that
 * coupling.
 *
 * SELECT IS NARROW ON PURPOSE. Only the five columns Contact and the footer
 * actually render are fetched (see `SiteSettings`). `site_name`, `tagline`,
 * `logo_url`, `favicon_url`, and the unobserved `opening_hours` JSON are not -
 * the header and footer display the localized catalogue name, never the
 * single-language database value, so fetching them would ship bytes no visitor
 * sees.
 */

const SITE_SETTINGS_COLUMNS = "phone, email, address, google_maps_url, instagram_url" as const;

/** Blank strings are treated as absent so the UI need only check for null. */
function orNull(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Site settings, or `empty` when no row is publicly visible.
 *
 * `maybeSingle()` rather than `single()`: `single()` treats zero rows as a Postgrest
 * error (PGRST116), which would report a legitimately unpublished singleton as a
 * database failure and make the distinction between empty and error meaningless.
 *
 * A published row whose contact columns are all null is returned as plain
 * `success` with null values - an authored-but-unpopulated record is a reasonable
 * state, and the Contact band renders its pending notice for it exactly as it does
 * for an absent record.
 *
 * Wrapped in React `cache()` so components that share one page render (the page
 * chrome's footer and the homepage Contact band) collapse into a single query
 * instead of reading the singleton twice per document.
 */
export const getSiteSettings = cache(async function getSiteSettings(): Promise<
  QueryResult<SiteSettings>
> {
  const supabase = getSupabaseServerClient();

  const response = await supabase.from("site_settings").select(SITE_SETTINGS_COLUMNS).limit(1);

  const result = toQueryResult(
    "site_settings.getSiteSettings",
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

  return {
    status: "success",
    data: {
      phone: orNull(row.phone),
      email: orNull(row.email),
      address: orNull(row.address),
      googleMapsUrl: orNull(row.google_maps_url),
      instagramUrl: orNull(row.instagram_url),
    },
  };
});
