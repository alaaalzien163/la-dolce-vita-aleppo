import "server-only";

import { toQueryResult, type QueryResult } from "@/lib/supabase/result";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/tables";

/**
 * Admin reads for `public.menus`.
 *
 * Separate from any future public menu reader for the same reasons that separate
 * `admin/sections` and `admin/venues` from their public counterparts: this uses the
 * authenticated client so RLS evaluates the admin's own policies, and inactive rows are
 * included because hiding them is exactly what the admin needs to see and change.
 *
 * `menus` carries no image column, so there is nothing here for image handling to reach.
 */

/** Columns the management screens read. `created_at` and `updated_at` are not among them. */
const ADMIN_MENU_COLUMNS =
  "id, name, slug, venue_id, description, display_order, is_active" as const;

export type AdminMenu = Pick<
  TableRow<"menus">,
  "id" | "name" | "slug" | "venue_id" | "description" | "display_order" | "is_active"
>;

/**
 * Every menu the admin may see, ordered as the public site orders its content:
 * `display_order` then `name`. If the admin were reordering against a preview that did
 * not match visitor ordering, the two would disagree.
 */
export async function listAdminMenus(): Promise<QueryResult<readonly AdminMenu[]>> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase
    .from("menus")
    .select(ADMIN_MENU_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  return toQueryResult("admin.menus.list", response, (rows) => rows.length === 0);
}

/** One menu by id, for the edit and delete-confirmation screens. */
export async function getAdminMenu(id: string): Promise<QueryResult<AdminMenu>> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase.from("menus").select(ADMIN_MENU_COLUMNS).eq("id", id).limit(1);

  const result = toQueryResult("admin.menus.get", response, (rows) => rows.length === 0);

  if (result.status !== "success") {
    return result;
  }

  const row = result.data[0];

  // `noUncheckedIndexedAccess` is on; the emptiness predicate above is not visible to the
  // compiler as a narrowing of index access.
  return row ? { status: "success", data: row } : { status: "empty" };
}

/** Columns needed to present a venue option in the menu form. */
const MENU_VENUE_COLUMNS = "id, name" as const;

export type MenuVenueOption = Pick<TableRow<"venues">, "id" | "name">;

/**
 * The venues a menu may be placed under, for the venue selector and for rendering the menu
 * list. Inactive venues are included: a menu may belong to a venue that is currently
 * unpublished, and the admin still needs to see and manage that. Existence of any
 * particular reference is then verified against the same authenticated client before a
 * write, so the leaky-focus problem - "the dropdown shows it, but is it real?" - never
 * arises.
 */
export async function listAdminMenuVenues(): Promise<QueryResult<readonly MenuVenueOption[]>> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase
    .from("venues")
    .select(MENU_VENUE_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  return toQueryResult("admin.menus.venues", response, (rows) => rows.length === 0);
}

/**
 * Whether a venue with this id is visible to the admin. This backs the action's "must
 * reference an existing venue" rule: the check runs against the authenticated client, so
 * RLS decides visibility the same way the form's own dropdown does. The foreign-key
 * constraint remains the final authority, and the action handles its `23503` failure too,
 * so a venue disappearing between render and submit cannot slip through as a silent
 * success.
 */
export async function menuVenueExists(id: string): Promise<boolean> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase.from("venues").select("id").eq("id", id).maybeSingle();

  return !response.error && response.data !== null;
}
