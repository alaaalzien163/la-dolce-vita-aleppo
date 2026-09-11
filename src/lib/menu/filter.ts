import type { PublicMenuBand } from "@/types/content";

/* -------------------------------------------------------------------------- */
/*  Filter value types                                                        */
/* -------------------------------------------------------------------------- */

export type AvailabilityFilter = "any" | "available" | "unavailable";
export type FeaturedFilter = "any" | "featured" | "regular";
export type PriceStatusFilter = "any" | "has" | "none";

/* -------------------------------------------------------------------------- */
/*  Shared helpers (pure, no server-only imports)                             */
/* -------------------------------------------------------------------------- */

/** Trims and lower-cases for case-insensitive matching. Arabic is unaffected. */
export function normalizeQuery(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Returns true when at least one text field includes the query substring. */
export function matchesSearch(
  fields: readonly (string | null | undefined)[],
  query: string,
): boolean {
  const needle = normalizeQuery(query);
  if (needle.length === 0) return true;
  return fields.some(
    (field) => typeof field === "string" && field.toLowerCase().includes(needle),
  );
}

/** NULL price → "none"; non-null → "has". */
export function matchesPriceStatus(
  price: number | string | null | undefined,
  status: PriceStatusFilter,
): boolean {
  if (status === "any") return true;
  const hasPrice = price !== null && price !== undefined;
  return status === "has" ? hasPrice : !hasPrice;
}

/* -------------------------------------------------------------------------- */
/*  Public menu band helpers                                                  */
/* -------------------------------------------------------------------------- */

export interface PublicMenuFilterValues {
  readonly search: string;
  readonly mainCategoryId: string | null;
  readonly categoryId: string | null;
}

export const EMPTY_PUBLIC_MENU_FILTERS: PublicMenuFilterValues = {
  search: "",
  mainCategoryId: null,
  categoryId: null,
};

export function hasActivePublicMenuFilters(
  filters: PublicMenuFilterValues,
): boolean {
  return (
    normalizeQuery(filters.search).length > 0 ||
    filters.mainCategoryId !== null ||
    filters.categoryId !== null
  );
}

/** Option for the main-category selector. */
export interface PublicMenuMainCategoryOption {
  readonly id: string;
  readonly name: string;
  readonly categories: readonly { readonly id: string; readonly name: string }[];
}

/**
 * Builds de-duplicated, order-preserving main-category options from the full
 * band. Each option carries its child categories for the dependent selector.
 */
export function collectPublicMenuMainCategories(
  band: PublicMenuBand,
): PublicMenuMainCategoryOption[] {
  const seen = new Map<string, PublicMenuMainCategoryOption>();
  for (const venue of band.venues) {
    for (const menu of venue.menus) {
      for (const main of menu.mainCategories) {
        if (seen.has(main.id)) continue;
        seen.set(main.id, {
          id: main.id,
          name: main.name,
          categories: main.categories.map((c) => ({ id: c.id, name: c.name })),
        });
      }
    }
  }
  return [...seen.values()];
}

export interface PublicMenuFilterResult {
  readonly band: PublicMenuBand;
  readonly itemCount: number;
}

/** Total available items across all venues/menus/main/categories. */
export function countPublicMenuItems(band: PublicMenuBand): number {
  let count = 0;
  for (const venue of band.venues) {
    for (const menu of venue.menus) {
      for (const main of menu.mainCategories) {
        for (const category of main.categories) {
          count += category.items.length;
        }
      }
    }
  }
  return count;
}

/**
 * Filters the band client-side: scope by main/category and search text.
 *
 * Empty branches are pruned when *any* filter is active, so visitors never see
 * a category with zero results sitting next to a category with matches.
 * When no filter is active the original band is returned unchanged so that the
 * published empty-state notices remain visible.
 */
export function filterPublicMenuBand(
  band: PublicMenuBand,
  filters: PublicMenuFilterValues,
): PublicMenuFilterResult {
  if (!hasActivePublicMenuFilters(filters)) {
    return { band, itemCount: countPublicMenuItems(band) };
  }

  const needle = normalizeQuery(filters.search);
  let itemCount = 0;

  const venues = band.venues
    .map((venue) => ({
      ...venue,
      menus: venue.menus
        .map((menu) => ({
          ...menu,
          mainCategories: menu.mainCategories
            .filter(
              (main) =>
                filters.mainCategoryId === null ||
                main.id === filters.mainCategoryId,
            )
            .map((main) => ({
              ...main,
              categories: main.categories
                .filter(
                  (category) =>
                    filters.categoryId === null ||
                    category.id === filters.categoryId,
                )
                .map((category) => {
                  const items = category.items.filter((item) =>
                    needle.length > 0
                      ? matchesSearch([item.name, item.description], needle)
                      : true,
                  );
                  itemCount += items.length;
                  return { ...category, items };
                })
                .filter((category) => category.items.length > 0),
            }))
            .filter((main) => main.categories.length > 0),
        }))
        .filter((menu) => menu.mainCategories.length > 0),
    }))
    .filter((venue) => venue.menus.length > 0);

  return { band: { venues }, itemCount };
}

/* -------------------------------------------------------------------------- */
/*  Result count formatting (client-side pluralisation)                       */
/* -------------------------------------------------------------------------- */

export type ResultCountForms = {
  readonly zero: string;
  readonly one: string;
  readonly two: string;
  readonly few: string;
  readonly many: string;
  readonly other: string;
};

/**
 * Lightweight client-side plural form for the result count.
 *
 * Uses `Intl.PluralRules` to pick the correct template, then substitutes
 * `%count%` with the locale-formatted number. No `next-intl` dependency
 * needed, so it works from any Client Component without a provider.
 */
export function formatResultCount(
  locale: string,
  count: number,
  forms: ResultCountForms,
): string {
  let category: keyof ResultCountForms = "other";

  try {
    category = new Intl.PluralRules(locale).select(count) as keyof ResultCountForms;
  } catch {
    // Falls through to "other" if the locale is malformed.
  }

  const template = forms[category] ?? forms.other;
  const formatted = new Intl.NumberFormat(locale).format(count);
  return template.replace("%count%", formatted);
}
