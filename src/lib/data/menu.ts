import "server-only";

import { cache } from "react";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isEmptyList, type QueryResult, toQueryResult } from "@/lib/supabase/result";
import type { TableRow } from "@/lib/supabase/tables";
import type {
  PublicMenu,
  PublicMenuBand,
  PublicMenuCategory,
  PublicMenuMainCategory,
  PublicMenuItem,
  PublicMenuTree,
  PublicVenue,
} from "@/types/content";

/**
 * Public read access to the menu hierarchy:
 *   sections -> venues -> menus -> menu_main_categories -> menu_categories -> menu_items
 *
 * FOUNDATION ONLY. No public page renders a menu yet; these accessors exist so
 * the menu phase connects to correct data access rather than starting over. They
 * are the single source the upcoming UI must use.
 *
 * BUSINESS RULES, applied level by level, all derived from the actual schema:
 *   - sections        are scoped to `is_active = true`
 *   - venues          are scoped to `is_active = true` AND an active section
 *   - menus           are scoped to `is_active = true` AND an active venue
 *   - main categories are scoped to `is_active = true` AND an active menu
 *   - categories      are scoped to `is_active = true` AND an active main category
 *   - menu items      are scoped to `is_available = true` (NOT `is_active`, which the
 *                      table does not have) AND an active category
 *
 * NO N+1: an accessor derives its ancestor id sets in a fixed small number of
 * queries (never one per row), then fetches the rows it returns in one final
 * query. Nothing here loops rows to issue per-row reads.
 *
 * RLS is the boundary and is never bypassed: all reads run on the anonymous server
 * client, and the active/available filters above only narrow within what RLS has
 * already permitted. `is_featured` on items is carried for a future highlight UI
 * and is never filtered here.
 */

/** Explicit column lists. Same discipline as the sections module. */
const VENUE_COLUMNS = "id, section_id, name, slug, description, display_order" as const;
const MENU_COLUMNS = "id, venue_id, name, slug, description, display_order" as const;
const MAIN_CATEGORY_COLUMNS = "id, menu_id, name, slug, description, display_order" as const;
const CATEGORY_COLUMNS = "id, main_category_id, name, slug, description, display_order" as const;
const ITEM_COLUMNS =
  "id, category_id, name, description, price, currency, display_order, image_url, is_featured" as const;

type VenueRow = Pick<
  TableRow<"venues">,
  "id" | "section_id" | "name" | "slug" | "description" | "display_order"
>;
type MenuRow = Pick<
  TableRow<"menus">,
  "id" | "venue_id" | "name" | "slug" | "description" | "display_order"
>;
type MainCategoryRow = Pick<
  TableRow<"menu_main_categories">,
  "id" | "menu_id" | "name" | "slug" | "description" | "display_order"
>;
type CategoryRow = Pick<
  TableRow<"menu_categories">,
  "id" | "main_category_id" | "name" | "slug" | "description" | "display_order"
>;
type ItemRow = Pick<
  TableRow<"menu_items">,
  | "id"
  | "category_id"
  | "name"
  | "description"
  | "price"
  | "currency"
  | "display_order"
  | "image_url"
  | "is_featured"
>;

/** A name is the one thing a menu node cannot render without. */
function hasName(name: string | null): boolean {
  return typeof name === "string" && name.trim().length > 0;
}

/**
 * Runs one ancestor filter and returns the surviving ids. `[]` when nothing
 * survives (so the child query can short-circuit), `null` when the query failed.
 */
async function stepIds(
  context: string,
  source:
    "sections" | "venues" | "menus" | "menu_main_categories" | "menu_categories" | "menu_items",
  parentColumn: "section_id" | "venue_id" | "menu_id" | "main_category_id" | "category_id",
  parentIds: readonly string[],
  activeColumn: "is_active" | "is_available",
): Promise<string[] | null> {
  if (parentIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseServerClient();

  // The column names are a deliberate runtime contract; the `as never` casts let
  // the union-typed source table through supabase-js' per-table generics.
  const { data, error } = await supabase
    .from(source)
    .select("id")
    .in(parentColumn as never, [...parentIds])
    .eq(activeColumn as never, true);

  if (error) {
    console.error(`[supabase] ${context} failed: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return null;
  }

  return data.map((row) => row.id);
}

/** How deep into the chain an accessor needs its ancestor id sets. */
type AncestryDepth = "menus" | "mainCategories" | "categories";

interface Ancestry {
  readonly sectionIds: readonly string[];
  readonly venueIds: readonly string[];
  readonly menuIds: readonly string[];
  readonly mainCategoryIds: readonly string[];
  readonly categoryIds: readonly string[];
}

/**
 * Resolves the id sets for the requested depth in a fixed number of queries.
 * Returns `null` when any query in the chain failed, which the callers must treat
 * as an error rather than an empty result.
 *
 * Wrapped in React `cache()` so several accessors running in the same render share
 * one resolved ancestry instead of re-running the ancestor queries. This is what
 * stops a menu page that composes a handful of accessors from tripling its "active
 * sections/venues" reads - the duplicate ancestors collapse to one. `getPublicMenuTree`
 * remains the recommended single call for a full browse page; the cache only makes
 * partial accessors safe to combine when a page genuinely needs a partial read.
 */
const resolveActiveIds = cache(async (depth: AncestryDepth): Promise<Ancestry | null> => {
  const supabase = getSupabaseServerClient();

  const { data: sections, error: sectionsError } = await supabase
    .from("sections")
    .select("id")
    .eq("is_active", true);

  if (sectionsError) {
    console.error(`[supabase] menu.sections failed: ${sectionsError.message}`, {
      code: sectionsError.code,
      details: sectionsError.details,
      hint: sectionsError.hint,
    });
    return null;
  }

  const sectionIds = sections.map((row) => row.id);

  const venueIds = await stepIds("menu.venues", "venues", "section_id", sectionIds, "is_active");
  if (venueIds === null) {
    return null;
  }

  const menuIds = await stepIds("menu.menus", "menus", "venue_id", venueIds, "is_active");
  if (menuIds === null) {
    return null;
  }

  if (depth === "menus") {
    return { sectionIds, venueIds, menuIds, mainCategoryIds: [], categoryIds: [] };
  }

  const mainCategoryIds = await stepIds(
    "menu.mainCategories",
    "menu_main_categories",
    "menu_id",
    menuIds,
    "is_active",
  );
  if (mainCategoryIds === null) {
    return null;
  }

  if (depth === "mainCategories") {
    return { sectionIds, venueIds, menuIds, mainCategoryIds, categoryIds: [] };
  }

  const categoryIds = await stepIds(
    "menu.categories",
    "menu_categories",
    "main_category_id",
    mainCategoryIds,
    "is_active",
  );
  if (categoryIds === null) {
    return null;
  }

  return { sectionIds, venueIds, menuIds, mainCategoryIds, categoryIds };
});

function mapVenue(row: VenueRow): PublicVenue {
  return {
    id: row.id,
    sectionId: row.section_id,
    name: row.name.trim(),
    slug: row.slug,
    description: row.description?.trim() ?? null,
    displayOrder: row.display_order,
  };
}

function mapMenu(row: MenuRow): PublicMenu {
  return {
    id: row.id,
    venueId: row.venue_id,
    name: row.name.trim(),
    slug: row.slug,
    description: row.description?.trim() ?? null,
    displayOrder: row.display_order,
  };
}

function mapMainCategory(row: MainCategoryRow): PublicMenuMainCategory {
  return {
    id: row.id,
    menuId: row.menu_id,
    name: row.name.trim(),
    slug: row.slug,
    description: row.description?.trim() ?? null,
    displayOrder: row.display_order,
  };
}

function mapCategory(row: CategoryRow): PublicMenuCategory {
  return {
    id: row.id,
    mainCategoryId: row.main_category_id,
    name: row.name.trim(),
    slug: row.slug,
    description: row.description?.trim() ?? null,
    displayOrder: row.display_order,
  };
}

function mapItem(row: ItemRow): PublicMenuItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name.trim(),
    description: row.description?.trim() ?? null,
    price: row.price,
    currency: row.currency,
    displayOrder: row.display_order,
    imageUrl: row.image_url,
    isFeatured: row.is_featured,
  };
}

/** Active menus beneath an active venue within an active section. */
export async function getPublicMenus(options?: {
  readonly limit?: number;
}): Promise<QueryResult<readonly PublicMenu[]>> {
  const ancestry = await resolveActiveIds("menus");

  if (ancestry === null) {
    return { status: "error", message: "content-unavailable" };
  }

  if (
    ancestry.sectionIds.length === 0 ||
    ancestry.venueIds.length === 0 ||
    ancestry.menuIds.length === 0
  ) {
    return { status: "empty" };
  }

  const supabase = getSupabaseServerClient();

  const base = supabase
    .from("menus")
    .select(MENU_COLUMNS)
    .in("venue_id", ancestry.venueIds)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  const response = options?.limit !== undefined ? await base.limit(options.limit) : await base;

  const result = toQueryResult("menus.getPublicMenus", response, isEmptyList);

  if (result.status !== "success") {
    return result;
  }

  const menus = result.data.filter((row) => hasName(row.name)).map(mapMenu);
  return menus.length === 0 ? { status: "empty" } : { status: "success", data: menus };
}

/** Active main categories beneath an active menu (within the rest of the chain). */
export async function getPublicMenuMainCategories(options?: {
  readonly limit?: number;
}): Promise<QueryResult<readonly PublicMenuMainCategory[]>> {
  const ancestry = await resolveActiveIds("mainCategories");

  if (ancestry === null) {
    return { status: "error", message: "content-unavailable" };
  }

  if (ancestry.sectionIds.length === 0 || ancestry.mainCategoryIds.length === 0) {
    return { status: "empty" };
  }

  const supabase = getSupabaseServerClient();

  const base = supabase
    .from("menu_main_categories")
    .select(MAIN_CATEGORY_COLUMNS)
    .in("menu_id", ancestry.menuIds)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  const response = options?.limit !== undefined ? await base.limit(options.limit) : await base;

  const result = toQueryResult(
    "menu_main_categories.getPublicMenuMainCategories",
    response,
    isEmptyList,
  );

  if (result.status !== "success") {
    return result;
  }

  const mainCategories = result.data.filter((row) => hasName(row.name)).map(mapMainCategory);
  return mainCategories.length === 0
    ? { status: "empty" }
    : { status: "success", data: mainCategories };
}

/** Active categories beneath an active main category (within the rest of the chain). */
export async function getPublicMenuCategories(options?: {
  readonly limit?: number;
}): Promise<QueryResult<readonly PublicMenuCategory[]>> {
  const ancestry = await resolveActiveIds("categories");

  if (ancestry === null) {
    return { status: "error", message: "content-unavailable" };
  }

  if (ancestry.sectionIds.length === 0 || ancestry.categoryIds.length === 0) {
    return { status: "empty" };
  }

  const supabase = getSupabaseServerClient();

  const base = supabase
    .from("menu_categories")
    .select(CATEGORY_COLUMNS)
    .in("main_category_id", ancestry.mainCategoryIds)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  const response = options?.limit !== undefined ? await base.limit(options.limit) : await base;

  const result = toQueryResult("menu_categories.getPublicMenuCategories", response, isEmptyList);

  if (result.status !== "success") {
    return result;
  }

  const categories = result.data.filter((row) => hasName(row.name)).map(mapCategory);
  return categories.length === 0 ? { status: "empty" } : { status: "success", data: categories };
}

/** Available items beneath an active category (within the rest of the chain). */
export async function getPublicMenuItems(options?: {
  readonly limit?: number;
}): Promise<QueryResult<readonly PublicMenuItem[]>> {
  const ancestry = await resolveActiveIds("categories");

  if (ancestry === null) {
    return { status: "error", message: "content-unavailable" };
  }

  if (ancestry.sectionIds.length === 0 || ancestry.categoryIds.length === 0) {
    return { status: "empty" };
  }

  const supabase = getSupabaseServerClient();

  const base = supabase
    .from("menu_items")
    .select(ITEM_COLUMNS)
    .in("category_id", ancestry.categoryIds)
    .eq("is_available", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  const response = options?.limit !== undefined ? await base.limit(options.limit) : await base;

  const result = toQueryResult("menu_items.getPublicMenuItems", response, isEmptyList);

  if (result.status !== "success") {
    return result;
  }

  const items = result.data.filter((row) => hasName(row.name)).map(mapItem);
  return items.length === 0 ? { status: "empty" } : { status: "success", data: items };
}

/** Groups rows by one column value, preserving insertion order. */
function groupBy<T, K extends string>(rows: readonly T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const bucket = map.get(key(row));
    if (bucket) {
      bucket.push(row);
    } else {
      map.set(key(row), [row]);
    }
  }
  return map;
}

/**
 * The full browse tree in one call: active sections, each with its active venues,
 * menus, main categories, categories, and available items. A fixed number of
 * queries (constant in the number of rows), so a menu page can render the whole
 * hierarchy without an N+1 pattern.
 */
export async function getPublicMenuTree(): Promise<QueryResult<PublicMenuTree>> {
  const ancestry = await resolveActiveIds("categories");

  if (ancestry === null) {
    return { status: "error", message: "content-unavailable" };
  }

  if (ancestry.sectionIds.length === 0) {
    return { status: "empty" };
  }

  const supabase = getSupabaseServerClient();

  const [sections, venues, menus, mainCategories, categories, items] = await Promise.all([
    supabase
      .from("sections")
      .select("id, name, slug, description, image_url, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("venues")
      .select(VENUE_COLUMNS)
      .in("section_id", ancestry.sectionIds)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("menus")
      .select(MENU_COLUMNS)
      .in("venue_id", ancestry.venueIds)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("menu_main_categories")
      .select(MAIN_CATEGORY_COLUMNS)
      .in("menu_id", ancestry.menuIds)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("menu_categories")
      .select(CATEGORY_COLUMNS)
      .in("main_category_id", ancestry.mainCategoryIds)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("menu_items")
      .select(ITEM_COLUMNS)
      .in("category_id", ancestry.categoryIds)
      .eq("is_available", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  for (const [context, result] of [
    ["tree.sections", sections],
    ["tree.venues", venues],
    ["tree.menus", menus],
    ["tree.mainCategories", mainCategories],
    ["tree.categories", categories],
    ["tree.items", items],
  ] as const) {
    if (result.error) {
      console.error(`[supabase] menu.${context} failed: ${result.error.message}`, {
        code: result.error.code,
        details: result.error.details,
        hint: result.error.hint,
      });
      return { status: "error", message: "content-unavailable" };
    }
  }

  const sectionRows = sections.data ?? [];
  const venueRows = venues.data ?? [];
  const menuRows = menus.data ?? [];
  const mainCategoryRows = mainCategories.data ?? [];
  const categoryRows = categories.data ?? [];
  const itemRows = items.data ?? [];

  const venuesBySection = groupBy(
    venueRows.filter((row) => hasName(row.name)),
    (row) => row.section_id,
  );
  const menusByVenue = groupBy(
    menuRows.filter((row) => hasName(row.name)),
    (row) => row.venue_id,
  );
  const mainCategoriesByMenu = groupBy(
    mainCategoryRows.filter((row) => hasName(row.name)),
    (row) => row.menu_id,
  );
  const categoriesByMain = groupBy(
    categoryRows.filter((row) => hasName(row.name)),
    (row) => row.main_category_id,
  );
  const itemsByCategory = groupBy(
    itemRows.filter((row) => hasName(row.name)),
    (row) => row.category_id,
  );

  const tree: PublicMenuTree = {
    sections: sectionRows
      .filter(
        (row) => hasName(row.name) && typeof row.slug === "string" && row.slug.trim().length > 0,
      )
      .map((section) => ({
        id: section.id,
        name: section.name.trim(),
        slug: section.slug,
        description: section.description?.trim() ?? null,
        imageUrl: section.image_url,
        displayOrder: section.display_order,
        venues: (venuesBySection.get(section.id) ?? []).map((venue) => ({
          ...mapVenue(venue),
          menus: (menusByVenue.get(venue.id) ?? []).map((menu) => ({
            ...mapMenu(menu),
            mainCategories: (mainCategoriesByMenu.get(menu.id) ?? []).map((main) => ({
              ...mapMainCategory(main),
              categories: (categoriesByMain.get(main.id) ?? []).map((category) => ({
                ...mapCategory(category),
                items: (itemsByCategory.get(category.id) ?? []).map(mapItem),
              })),
            })),
          })),
        })),
      })),
  };

  return tree.sections.length === 0 ? { status: "empty" } : { status: "success", data: tree };
}

/**
 * The homepage Menu band: active venues, each with its active menus, main
 * categories, categories, and available items.
 *
 * WHY NOT `getPublicMenuTree()`. The tree is the full-browse aggregate - sections
 * through items in one shape - and it reads each table once. But the band does not
 * need Section rows: Sections are already loaded for the Departments band on the
 * same page, and re-reading them here would fetch the same rows twice. So this
 * reader starts from venues and takes the active section ids from the caller
 * (`sectionIds`, the Departments result on the homepage), which drops its cost to
 * exactly one query per level beneath Sections: venues, menus, main categories,
 * categories, items - 5 queries total, no duplicates, no N+1, in a fixed count.
 *
 * CHAINED, NOT PARALLEL BY ANCESTRY. Each level is scoped by the ACTUAL ids the
 * previous level returned, so rows are never fetched for an ancestor that is not
 * itself visible: an inactive venue's menus are never even requested. The levels
 * are resolved in sequence rather than in a `Promise.all` because each depends on
 * the previous level's result - the queries are, by design, not parallel.
 *
 * EMPTINESS. Districts with no venues, or venues with no menus, collapse to the
 * band's `empty` state: the segment of the hierarchy that would exist has no rows,
 * and rendering empty venue blocks would be noise. Below that, emptiness is
 * preserved per node - a menu with no main categories, or a category with no
 * items, stays in the structure with an empty child array so the band can render
 * its quiet notice where the content would be.
 */
export async function getPublicMenuBand(options?: {
  readonly sectionIds?: readonly string[];
}): Promise<QueryResult<PublicMenuBand>> {
  const supabase = getSupabaseServerClient();

  let sectionIds: readonly string[];

  if (options?.sectionIds !== undefined) {
    sectionIds = options.sectionIds;
  } else {
    const { data, error } = await supabase.from("sections").select("id").eq("is_active", true);

    if (error) {
      console.error(`[supabase] menu.band.sections failed: ${error.message}`, {
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return { status: "error", message: "content-unavailable" };
    }

    sectionIds = data.map((row) => row.id);
  }

  if (sectionIds.length === 0) {
    return { status: "empty" };
  }

  const venues = await supabase
    .from("venues")
    .select(VENUE_COLUMNS)
    .in("section_id", sectionIds)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (venues.error) {
    console.error(`[supabase] menu.band.venues failed: ${venues.error.message}`, {
      code: venues.error.code,
      details: venues.error.details,
      hint: venues.error.hint,
    });
    return { status: "error", message: "content-unavailable" };
  }

  const venueRows = venues.data;
  if (venueRows.length === 0) {
    return { status: "empty" };
  }

  const venueIds = venueRows.map((row) => row.id);

  const menus = await supabase
    .from("menus")
    .select(MENU_COLUMNS)
    .in("venue_id", venueIds)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (menus.error) {
    console.error(`[supabase] menu.band.menus failed: ${menus.error.message}`, {
      code: menus.error.code,
      details: menus.error.details,
      hint: menus.error.hint,
    });
    return { status: "error", message: "content-unavailable" };
  }

  const menuRows = menus.data;
  if (menuRows.length === 0) {
    return { status: "empty" };
  }

  const menuIds = menuRows.map((row) => row.id);

  const mainCategories = await supabase
    .from("menu_main_categories")
    .select(MAIN_CATEGORY_COLUMNS)
    .in("menu_id", menuIds)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (mainCategories.error) {
    console.error(`[supabase] menu.band.mainCategories failed: ${mainCategories.error.message}`, {
      code: mainCategories.error.code,
      details: mainCategories.error.details,
      hint: mainCategories.error.hint,
    });
    return { status: "error", message: "content-unavailable" };
  }

  const mainCategoryRows = mainCategories.data;
  const mainCategoryIds = mainCategoryRows.map((row) => row.id);

  // PostgREST rejects `in.()` with no values, so an empty parent level must
  // short-circuit instead of building a query that could never return rows.
  const categoryRows =
    mainCategoryIds.length === 0
      ? []
      : await (async () => {
          const response = await supabase
            .from("menu_categories")
            .select(CATEGORY_COLUMNS)
            .in("main_category_id", mainCategoryIds)
            .eq("is_active", true)
            .order("display_order", { ascending: true })
            .order("name", { ascending: true });

          if (response.error) {
            console.error(`[supabase] menu.band.categories failed: ${response.error.message}`, {
              code: response.error.code,
              details: response.error.details,
              hint: response.error.hint,
            });
            return null;
          }

          return response.data;
        })();

  if (categoryRows === null) {
    return { status: "error", message: "content-unavailable" };
  }

  const categoryIds = categoryRows.map((row) => row.id);

  const itemRows =
    categoryIds.length === 0
      ? []
      : await (async () => {
          const response = await supabase
            .from("menu_items")
            .select(ITEM_COLUMNS)
            .in("category_id", categoryIds)
            .eq("is_available", true)
            .order("display_order", { ascending: true })
            .order("name", { ascending: true });

          if (response.error) {
            console.error(`[supabase] menu.band.items failed: ${response.error.message}`, {
              code: response.error.code,
              details: response.error.details,
              hint: response.error.hint,
            });
            return null;
          }

          return response.data;
        })();

  if (itemRows === null) {
    return { status: "error", message: "content-unavailable" };
  }

  const menusByVenue = groupBy(
    menuRows.filter((row) => hasName(row.name)),
    (row) => row.venue_id,
  );
  const mainCategoriesByMenu = groupBy(
    mainCategoryRows.filter((row) => hasName(row.name)),
    (row) => row.menu_id,
  );
  const categoriesByMain = groupBy(
    categoryRows.filter((row) => hasName(row.name)),
    (row) => row.main_category_id,
  );
  const itemsByCategory = groupBy(
    itemRows.filter((row) => hasName(row.name)),
    (row) => row.category_id,
  );

  const venuesWithMenus = venueRows
    .filter((row) => hasName(row.name))
    .map((venue) => ({
      ...mapVenue(venue),
      menus: (menusByVenue.get(venue.id) ?? []).map((menu) => ({
        ...mapMenu(menu),
        mainCategories: (mainCategoriesByMenu.get(menu.id) ?? []).map((main) => ({
          ...mapMainCategory(main),
          categories: (categoriesByMain.get(main.id) ?? []).map((category) => ({
            ...mapCategory(category),
            items: (itemsByCategory.get(category.id) ?? []).map(mapItem),
          })),
        })),
      })),
    }));

  // A venue with no published menu has nothing for the Menu band to show - the
  // Departments band already presents the venue itself. Empty-venue blocks would
  // be repetition, so they are dropped; when that leaves nothing, the band is empty.
  const venuesWithMenusToShow = venuesWithMenus.filter((venue) => venue.menus.length > 0);

  if (venuesWithMenusToShow.length === 0) {
    return { status: "empty" };
  }

  return { status: "success", data: { venues: venuesWithMenusToShow } };
}
