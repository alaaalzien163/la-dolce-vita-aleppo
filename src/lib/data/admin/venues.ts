import "server-only";

import { toQueryResult, type QueryResult } from "@/lib/supabase/result";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/tables";

/**
 * Admin reads for `public.venues`.
 *
 * Separate from any future public venue reader for the same reasons that separate
 * `admin/sections` from the public sections module: this uses the authenticated client so
 * RLS evaluates the admin's own policies, and inactive rows are included because hiding
 * them is exactly what the admin needs to see and change.
 *
 * No image column is read. The `image_url` column exists on the table, but venue CRUD
 * deliberately does not manage images, so carrying the field would only let the UI reach
 * data it has no way to keep in step.
 */

/** Columns the management screens read. `created_at` and `updated_at` are not among them. */
const ADMIN_VENUE_COLUMNS =
  "id, name, slug, section_id, description, display_order, is_active" as const;

export type AdminVenue = Pick<
  TableRow<"venues">,
  "id" | "name" | "slug" | "section_id" | "description" | "display_order" | "is_active"
>;

/**
 * Every venue the admin may see, ordered as the public site orders its content:
 * `display_order` then `name`. If the admin were reordering against a preview that did
 * not match visitor ordering, the two would disagree.
 */
export async function listAdminVenues(): Promise<QueryResult<readonly AdminVenue[]>> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase
    .from("venues")
    .select(ADMIN_VENUE_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  return toQueryResult("admin.venues.list", response, (rows) => rows.length === 0);
}

/** One venue by id, for the edit and delete-confirmation screens. */
export async function getAdminVenue(id: string): Promise<QueryResult<AdminVenue>> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase.from("venues").select(ADMIN_VENUE_COLUMNS).eq("id", id).limit(1);

  const result = toQueryResult("admin.venues.get", response, (rows) => rows.length === 0);

  if (result.status !== "success") {
    return result;
  }

  const row = result.data[0];

  // `noUncheckedIndexedAccess` is on; the emptiness predicate above is not visible to the
  // compiler as a narrowing of index access.
  return row ? { status: "success", data: row } : { status: "empty" };
}

/** Columns needed to present a section option in the venue form. */
const VENUE_SECTION_COLUMNS = "id, name" as const;

export type VenueSectionOption = Pick<TableRow<"sections">, "id" | "name">;

/**
 * The sections a venue may be placed in, for the section selector and for rendering the
 * venue list. Inactive sections are included: a venue may belong to a section that is
 * currently unpublished, and the admin still needs to see and manage that. Existence of
 * any particular reference is then verified against this same set before a write, so the
 * leaky-focus problem - "the dropdown shows it, but is it real?" - never arises.
 */
export async function listAdminVenueSections(): Promise<
  QueryResult<readonly VenueSectionOption[]>
> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase
    .from("sections")
    .select(VENUE_SECTION_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  return toQueryResult("admin.venues.sections", response, (rows) => rows.length === 0);
}

/**
 * Whether a section with this id is visible to the admin. This backs the action's
 * "must reference an existing section" rule: the check runs against the authenticated
 * client, so RLS decides visibility the same way the form's own dropdown does. The
 * foreign-key constraint remains the final authority, and the action handles its
 * `23503` failure too, so a section disappearing between render and submit cannot slip
 * through as a silent success.
 */
export async function venueSectionExists(id: string): Promise<boolean> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase.from("sections").select("id").eq("id", id).maybeSingle();

  return !response.error && response.data !== null;
}
