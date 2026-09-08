import "server-only";

import { toQueryResult, type QueryResult } from "@/lib/supabase/result";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/tables";

/**
 * Admin reads for `public.menu_categories`.
 *
 * Separate from any future public reader for the same reasons that separate the other admin
 * data modules from their public counterparts: this uses the authenticated client so RLS
 * evaluates the admin's own policies, and inactive rows are included because hiding them is
 * exactly what the admin needs to see and change.
 *
 * `menu_categories` carries no image column, so there is nothing here for image handling to
 * reach.
 */

/** Columns the management screens read. `created_at` and `updated_at` are not among them. */
const ADMIN_MENU_CATEGORY_COLUMNS =
  "id, name, slug, main_category_id, description, display_order, is_active" as const;

export type AdminMenuCategory = Pick<
  TableRow<"menu_categories">,
  "id" | "name" | "slug" | "main_category_id" | "description" | "display_order" | "is_active"
>;

/**
 * Every category the admin may see, ordered as the public site orders its content:
 * `display_order` then `name`. If the admin were reordering against a preview that did not
 * match visitor ordering, the two would disagree.
 */
export async function listAdminMenuCategories(): Promise<
  QueryResult<readonly AdminMenuCategory[]>
> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase
    .from("menu_categories")
    .select(ADMIN_MENU_CATEGORY_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  return toQueryResult("admin.menuCategories.list", response, (rows) => rows.length === 0);
}

/** One category by id, for the edit and delete-confirmation screens. */
export async function getAdminMenuCategory(id: string): Promise<QueryResult<AdminMenuCategory>> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase
    .from("menu_categories")
    .select(ADMIN_MENU_CATEGORY_COLUMNS)
    .eq("id", id)
    .limit(1);

  const result = toQueryResult("admin.menuCategories.get", response, (rows) => rows.length === 0);

  if (result.status !== "success") {
    return result;
  }

  const row = result.data[0];

  // `noUncheckedIndexedAccess` is on; the emptiness predicate above is not visible to the
  // compiler as a narrowing of index access.
  return row ? { status: "success", data: row } : { status: "empty" };
}

/** A selectable parent, carrying the menu it sits under so the option is unambiguous. */
export type MenuCategoryParentOption = Pick<
  TableRow<"menu_main_categories">,
  "id" | "name" | "menu_id"
>;

/**
 * Main categories grouped by the menu they belong to.
 *
 * TWO NAMES ARE NEEDED TO IDENTIFY A PARENT. Main-category names repeat across menus - a
 * lunch menu and a dinner menu can each have "المقبلات" - so an option list showing only
 * the main-category name is genuinely ambiguous, and picking the wrong one silently files a
 * category under the wrong menu. Grouping supplies the missing half of the identity.
 *
 * `menuName` is nullable rather than defaulted to a string: the label for an unreadable menu
 * is a UI decision that needs a translator, and this module has none. The UI resolves null.
 */
export interface MenuCategoryParentGroup {
  readonly menuId: string;
  readonly menuName: string | null;
  readonly mainCategories: readonly MenuCategoryParentOption[];
}

const PARENT_MAIN_CATEGORY_COLUMNS = "id, name, menu_id" as const;
const PARENT_MENU_COLUMNS = "id, name" as const;

/**
 * The main categories a category may be placed under, grouped by menu and ordered the way
 * both parents are ordered elsewhere.
 *
 * Both queries run on the authenticated client, so the selector only ever exposes rows RLS
 * already permits the admin to read; inactive parents are included, because a category can
 * legitimately sit under an unpublished menu or main category and the admin still needs to
 * manage it.
 *
 * The two reads are concurrent and are treated differently on failure, deliberately. Main
 * categories are the actual parent, so failing to read them is an error: there is nothing to
 * choose from. Menus only supply labelling context, so failing to read them degrades the
 * labels to null and leaves the form usable rather than blocking a save on a cosmetic query.
 */
export async function listAdminCategoryParentGroups(): Promise<
  QueryResult<readonly MenuCategoryParentGroup[]>
> {
  const supabase = await getSupabaseAuthClient();

  const [mainCategoriesResponse, menusResponse] = await Promise.all([
    supabase
      .from("menu_main_categories")
      .select(PARENT_MAIN_CATEGORY_COLUMNS)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("menus")
      .select(PARENT_MENU_COLUMNS)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const mainCategories = toQueryResult(
    "admin.menuCategories.mainCategories",
    mainCategoriesResponse,
    (rows) => rows.length === 0,
  );

  if (mainCategories.status !== "success") {
    return mainCategories;
  }

  if (menusResponse.error) {
    console.error(`[supabase] admin.menuCategories.menus failed: ${menusResponse.error.message}`, {
      code: menusResponse.error.code,
      details: menusResponse.error.details,
      hint: menusResponse.error.hint,
    });
  }

  const menuOrder = menusResponse.data ?? [];
  const grouped = new Map<string, MenuCategoryParentOption[]>();

  for (const mainCategory of mainCategories.data) {
    const bucket = grouped.get(mainCategory.menu_id);
    if (bucket) {
      bucket.push(mainCategory);
    } else {
      grouped.set(mainCategory.menu_id, [mainCategory]);
    }
  }

  const groups: MenuCategoryParentGroup[] = [];

  // Menu order first, so the selector follows the same sequence as the menus screen.
  for (const menu of menuOrder) {
    const mainCategoriesForMenu = grouped.get(menu.id);
    if (mainCategoriesForMenu) {
      groups.push({ menuId: menu.id, menuName: menu.name, mainCategories: mainCategoriesForMenu });
      grouped.delete(menu.id);
    }
  }

  // Anything left belongs to a menu the admin cannot read. It is still a valid parent, so it
  // is offered rather than hidden - dropping it would make an existing category un-editable.
  for (const [menuId, mainCategoriesForMenu] of grouped) {
    groups.push({ menuId, menuName: null, mainCategories: mainCategoriesForMenu });
  }

  return { status: "success", data: groups };
}

/**
 * Whether a main category with this id is visible to the admin. This backs the action's
 * "must reference an existing main category" rule: the check runs against the authenticated
 * client, so RLS decides visibility the same way the form's own selector does. The
 * foreign-key constraint remains the final authority, and the action handles its `23503`
 * failure too, so a parent disappearing between render and submit cannot slip through as a
 * silent success.
 */
export async function categoryMainCategoryExists(id: string): Promise<boolean> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase
    .from("menu_main_categories")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  return !response.error && response.data !== null;
}

/** One parent's identity, flattened for display. `menuName` is null when unreadable. */
export interface MenuCategoryParentLabel {
  readonly mainCategoryName: string;
  readonly menuName: string | null;
}

/**
 * Flattens the grouped parents into an id lookup for the list and delete screens.
 *
 * Pure and derived from the same query that builds the selector, so a row's displayed parent
 * and its selectable parent can never disagree. No second database round trip and no join to
 * get wrong.
 */
export function buildParentLabelLookup(
  groups: readonly MenuCategoryParentGroup[],
): ReadonlyMap<string, MenuCategoryParentLabel> {
  const lookup = new Map<string, MenuCategoryParentLabel>();

  for (const group of groups) {
    for (const mainCategory of group.mainCategories) {
      lookup.set(mainCategory.id, {
        mainCategoryName: mainCategory.name,
        menuName: group.menuName,
      });
    }
  }

  return lookup;
}
