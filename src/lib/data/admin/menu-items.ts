import "server-only";

import { toQueryResult, type QueryResult } from "@/lib/supabase/result";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/tables";

/**
 * Admin reads for `public.menu_items`.
 *
 * Separate from any future public reader for the same reasons that separate the other admin
 * data modules from their public counterparts: this uses the authenticated client so RLS
 * evaluates the admin's own policies, and unavailable rows are included because hiding them is
 * exactly what the admin needs to see and change.
 *
 * The column list mirrors the generated schema exactly. `menu_items` has no `slug` and no
 * `is_active`; it has `is_available` and `is_featured`, and both are carried because the
 * management table shows them and the edit form has to round-trip them.
 */

/** Columns the management screens read. `created_at` and `updated_at` are not among them. */
const ADMIN_MENU_ITEM_COLUMNS =
  "id, name, category_id, description, price, currency, image_url, is_available, is_featured, display_order" as const;

export type AdminMenuItem = Pick<
  TableRow<"menu_items">,
  | "id"
  | "name"
  | "category_id"
  | "description"
  | "price"
  | "currency"
  | "image_url"
  | "is_available"
  | "is_featured"
  | "display_order"
>;

/**
 * Every menu item the admin may see, ordered as the public site orders its content:
 * `display_order` then `name`. If the admin were reordering against a preview that did not
 * match visitor ordering, the two would disagree.
 */
export async function listAdminMenuItems(): Promise<QueryResult<readonly AdminMenuItem[]>> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase
    .from("menu_items")
    .select(ADMIN_MENU_ITEM_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  return toQueryResult("admin.menuItems.list", response, (rows) => rows.length === 0);
}

/** One menu item by id, for the edit and delete-confirmation screens. */
export async function getAdminMenuItem(id: string): Promise<QueryResult<AdminMenuItem>> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase
    .from("menu_items")
    .select(ADMIN_MENU_ITEM_COLUMNS)
    .eq("id", id)
    .limit(1);

  const result = toQueryResult("admin.menuItems.get", response, (rows) => rows.length === 0);

  if (result.status !== "success") {
    return result;
  }

  const row = result.data[0];

  // `noUncheckedIndexedAccess` is on; the emptiness predicate above is not visible to the
  // compiler as a narrowing of index access.
  return row ? { status: "success", data: row } : { status: "empty" };
}

/** A selectable parent category. */
export type MenuItemCategoryOption = Pick<
  TableRow<"menu_categories">,
  "id" | "name" | "main_category_id"
>;

/**
 * Categories grouped by the main category they sit under, carrying the menu above that.
 *
 * THREE NAMES ARE NEEDED TO IDENTIFY A CATEGORY HERE. This is the deepest level in the
 * hierarchy, and names repeat freely at every step: two menus can both have a "المقبلات" main
 * category, each containing a "بارد" category. Offering only the category name would make the
 * selector genuinely ambiguous, and choosing wrongly files a dish under the wrong menu.
 *
 * `mainCategoryName` and `menuName` are nullable rather than defaulted to a string, because
 * the label for an unreadable ancestor is a UI decision that needs a translator and this
 * module has none. The UI resolves null.
 */
export interface MenuItemCategoryGroup {
  readonly mainCategoryId: string;
  readonly mainCategoryName: string | null;
  readonly menuId: string | null;
  readonly menuName: string | null;
  readonly categories: readonly MenuItemCategoryOption[];
}

const PARENT_CATEGORY_COLUMNS = "id, name, main_category_id" as const;
const PARENT_MAIN_CATEGORY_COLUMNS = "id, name, menu_id" as const;
const PARENT_MENU_COLUMNS = "id, name" as const;

/**
 * The categories an item may be placed in, grouped by main category and ordered the way the
 * whole hierarchy is ordered elsewhere: menus, then main categories, then categories.
 *
 * All three reads run on the authenticated client, so the selector only ever exposes rows RLS
 * already permits; inactive ancestors are included, because an item can legitimately sit under
 * unpublished parents and the admin still needs to manage it.
 *
 * The reads are concurrent and failures are treated differently, deliberately. Categories are
 * the actual parent, so failing to read them is an error: there is nothing to choose from. The
 * two ancestor reads supply labelling context only, so failing either degrades its names to
 * null and leaves the form usable rather than blocking a save on a cosmetic query.
 */
export async function listAdminItemCategoryGroups(): Promise<
  QueryResult<readonly MenuItemCategoryGroup[]>
> {
  const supabase = await getSupabaseAuthClient();

  const [categoriesResponse, mainCategoriesResponse, menusResponse] = await Promise.all([
    supabase
      .from("menu_categories")
      .select(PARENT_CATEGORY_COLUMNS)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
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

  const categories = toQueryResult(
    "admin.menuItems.categories",
    categoriesResponse,
    (rows) => rows.length === 0,
  );

  if (categories.status !== "success") {
    return categories;
  }

  for (const [context, response] of [
    ["admin.menuItems.mainCategories", mainCategoriesResponse],
    ["admin.menuItems.menus", menusResponse],
  ] as const) {
    if (response.error) {
      console.error(`[supabase] ${context} failed: ${response.error.message}`, {
        code: response.error.code,
        details: response.error.details,
        hint: response.error.hint,
      });
    }
  }

  const mainCategories = mainCategoriesResponse.data ?? [];
  const menus = menusResponse.data ?? [];

  const menuNameById = new Map(menus.map((menu) => [menu.id, menu.name]));

  const categoriesByMainCategory = new Map<string, MenuItemCategoryOption[]>();
  for (const category of categories.data) {
    const bucket = categoriesByMainCategory.get(category.main_category_id);
    if (bucket) {
      bucket.push(category);
    } else {
      categoriesByMainCategory.set(category.main_category_id, [category]);
    }
  }

  const groups: MenuItemCategoryGroup[] = [];

  // Main categories are already ordered; walking them in menu order keeps the selector in the
  // same sequence as the menus screen rather than an arbitrary one.
  const mainCategoriesInMenuOrder = [
    ...menus.flatMap((menu) => mainCategories.filter((main) => main.menu_id === menu.id)),
    // Main categories whose menu is unreadable still hold valid categories, so they follow
    // rather than disappearing - dropping them would make existing items un-editable.
    ...mainCategories.filter((main) => !menuNameById.has(main.menu_id)),
  ];

  for (const mainCategory of mainCategoriesInMenuOrder) {
    const categoriesForMain = categoriesByMainCategory.get(mainCategory.id);

    if (!categoriesForMain) {
      continue;
    }

    groups.push({
      mainCategoryId: mainCategory.id,
      mainCategoryName: mainCategory.name,
      menuId: mainCategory.menu_id,
      menuName: menuNameById.get(mainCategory.menu_id) ?? null,
      categories: categoriesForMain,
    });

    categoriesByMainCategory.delete(mainCategory.id);
  }

  // Categories whose main category is unreadable. Same reasoning: still valid parents.
  for (const [mainCategoryId, categoriesForMain] of categoriesByMainCategory) {
    groups.push({
      mainCategoryId,
      mainCategoryName: null,
      menuId: null,
      menuName: null,
      categories: categoriesForMain,
    });
  }

  return { status: "success", data: groups };
}

/**
 * Whether a category with this id is visible to the admin. This backs the action's "must
 * reference an existing category" rule: the check runs against the authenticated client, so
 * RLS decides visibility the same way the form's own selector does. The foreign-key constraint
 * remains the final authority, and the action handles its `23503` failure too, so a category
 * disappearing between render and submit cannot slip through as a silent success.
 */
export async function menuItemCategoryExists(id: string): Promise<boolean> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase.from("menu_categories").select("id").eq("id", id).maybeSingle();

  return !response.error && response.data !== null;
}

/** One item's full ancestry, flattened for display. Null names mean unreadable ancestors. */
export interface MenuItemCategoryLabel {
  readonly categoryName: string;
  readonly mainCategoryName: string | null;
  readonly menuName: string | null;
}

/**
 * Flattens the grouped categories into an id lookup for the list and delete screens.
 *
 * Pure and derived from the same query that builds the selector, so a row's displayed ancestry
 * and its selectable ancestry can never disagree. No second round trip and no join to get
 * wrong.
 */
export function buildItemCategoryLabelLookup(
  groups: readonly MenuItemCategoryGroup[],
): ReadonlyMap<string, MenuItemCategoryLabel> {
  const lookup = new Map<string, MenuItemCategoryLabel>();

  for (const group of groups) {
    for (const category of group.categories) {
      lookup.set(category.id, {
        categoryName: category.name,
        mainCategoryName: group.mainCategoryName,
        menuName: group.menuName,
      });
    }
  }

  return lookup;
}
