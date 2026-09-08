import "server-only";

import { getSupabaseAuthClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/tables";

/**
 * Admin reads for `public.site_settings`, the settings singleton.
 *
 * Reads run on the authenticated client, so RLS evaluates the admin's own
 * policies. No domain mapping is done here: what the generated schema says is
 * stored (including raw JSON in `opening_hours`) is exactly what the form and
 * the action reason about.
 */

/**
 * Every column the management screen reads. `opening_hours` is included
 * read-only: the form and the action preserve it untouched, because its JSON
 * shape has never been defined.
 */
const ADMIN_SITE_SETTINGS_COLUMNS =
  "id, site_name, tagline, logo_url, favicon_url, phone, email, address, google_maps_url, instagram_url, opening_hours, singleton_key, created_at, updated_at" as const;

export type AdminSiteSettings = TableRow<"site_settings">;

/**
 * Postgres raises PGRST116 when a `.maybeSingle()` request matches more than one
 * row. That is the signature of the singleton invariant having been broken, and
 * it must not be mistaken for a generic failure: duplicates are a correctness
 * problem the admin has to fix in the database before anything can be saved.
 */
const MULTIPLE_ROWS_CODE = "PGRST116";

export type AdminSiteSettingsRead =
  | { readonly status: "success"; readonly settings: AdminSiteSettings }
  | { readonly status: "empty" }
  | { readonly status: "malformed" }
  | { readonly status: "error" };

/**
 * The singleton.
 *
 * `site_settings` is designed to hold exactly one row: the page creates it on
 * first save and every save after that updates in place. `maybeSingle()` models
 * that design as an error - PGRST116 - rather than silently choosing one of the
 * duplicates, because saving over a broken singleton would quietly replace one
 * of two truths and make the mess harder to spot.
 *
 * Zero rows is a legitimate state: it means "never saved once", and the form
 * presents itself as the first save.
 */
export async function getAdminSiteSettings(): Promise<AdminSiteSettingsRead> {
  const supabase = await getSupabaseAuthClient();

  const { data, error } = await supabase
    .from("site_settings")
    .select(ADMIN_SITE_SETTINGS_COLUMNS)
    .maybeSingle();

  if (error) {
    if (error.code === MULTIPLE_ROWS_CODE) {
      return { status: "malformed" };
    }

    console.error(`[supabase] admin.siteSettings.get failed: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { status: "error" };
  }

  if (data === null) {
    return { status: "empty" };
  }

  return { status: "success", settings: data };
}
