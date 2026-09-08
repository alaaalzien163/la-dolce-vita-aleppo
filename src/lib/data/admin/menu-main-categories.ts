import "server-only";

import { toQueryResult, type QueryResult } from "@/lib/supabase/result";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/tables";

/**
 * Admin reads for `public.menu_main_categories`.
 *
 * Separate from any future public reader for the same reasons that separate the other
 * admin data modules from their public counterparts: this uses the authenticated client so
 * RLS evaluates the admin's own policies, and inactive rows are included because hiding
 * them is exactly what the admin needs to see and change.
 *
 * `menu_main_categories` carries no image column, so there is nothing here for image
 * handling to reach.
 */

/** Columns the management screens read. `created_at` and `updated_at` are not among them. */
const ADMIN_MAIN_CATEGORY_COLUMNS =
  "id, name, slug, menu_id, description, display_order, is_active" as const;

export type AdminMenuMainCategory = Pick<
  TableRow<"menu_main_categories">,
  "id" | "name" | "slug" | "menu_id" | "description" | "display_order" | "is_active"
>;

/**
 * Every main category the admin may see, ordered as the public site orders its content:
 * `display_order` then `name`. If the admin were reordering against a preview that did not
 * match visitor ordering, the two would disagree.
 */
export async function listAdminMenuMainCategories(): Promise<
  QueryResult<readonly AdminMenuMainCategory[]>
> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase
    .from("menu_main_categories")
    .select(ADMIN_MAIN_CATEGORY_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  return toQueryResult("admin.menuMainCategories.list", response, (rows) => rows.length === 0);
}

/** One main category by id, for the edit and delete-confirmation screens. */
export async function getAdminMenuMainCategory(
  id: string,
): Promise<QueryResult<AdminMenuMainCategory>> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase
    .from("menu_main_categories")
    .select(ADMIN_MAIN_CATEGORY_COLUMNS)
    .eq("id", id)
    .limit(1);

  const result = toQueryResult(
    "admin.menuMainCategories.get",
    response,
    (rows) => rows.length === 0,
  );

  if (result.status !== "success") {
    return result;
  }

  const row = result.data[0];

  // `noUncheckedIndexedAccess` is on; the emptiness predicate above is not visible to the
  // compiler as a narrowing of index access.
  return row ? { status: "success", data: row } : { status: "empty" };
}

/** Columns needed to present a menu option in the main-category form. */
const MAIN_CATEGORY_MENU_COLUMNS = "id, name" as const;

export type MainCategoryMenuOption = Pick<TableRow<"menus">, "id" | "name">;

/**
 * The menus a main category may be placed under, for the menu selector and for rendering
 * the list. Inactive menus are included: a category may belong to a menu that is currently
 * unpublished, and the admin still needs to see and manage that.
 *
 * This runs on the authenticated client, so the selector only ever exposes menus RLS
 * already permits the admin to read. Existence of any particular reference is then
 * verified against the same client before a write, so the leaky-focus problem - "the
 * dropdown shows it, but is it real?" - never arises.
 */
export async function listAdminMainCategoryMenus(): Promise<
  QueryResult<readonly MainCategoryMenuOption[]>
> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase
    .from("menus")
    .select(MAIN_CATEGORY_MENU_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  return toQueryResult("admin.menuMainCategories.menus", response, (rows) => rows.length === 0);
}

/**
 * Whether a menu with this id is visible to the admin. This backs the action's "must
 * reference an existing menu" rule: the check runs against the authenticated client, so RLS
 * decides visibility the same way the form's own dropdown does. The foreign-key constraint
 * remains the final authority, and the action handles its `23503` failure too, so a menu
 * disappearing between render and submit cannot slip through as a silent success.
 */
export async function mainCategoryMenuExists(id: string): Promise<boolean> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase.from("menus").select("id").eq("id", id).maybeSingle();

  return !response.error && response.data !== null;
}
