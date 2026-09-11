"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import type {
  AvailabilityFilter,
  FeaturedFilter,
  PriceStatusFilter,
} from "@/lib/menu/filter";

export interface AdminMenuItemFilterValues {
  readonly search: string;
  readonly mainCategoryId: string | null;
  readonly categoryId: string | null;
  readonly availability: AvailabilityFilter;
  readonly featured: FeaturedFilter;
  readonly price: PriceStatusFilter;
}

export interface AdminMenuItemsFilterLabels {
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly filterMainCategory: string;
  readonly allMainCategories: string;
  readonly filterCategory: string;
  readonly allCategories: string;
  readonly selectMainCategoryHint: string;
  readonly filterAvailability: string;
  readonly allAvailability: string;
  readonly filterAvailableOnly: string;
  readonly filterUnavailableOnly: string;
  readonly filterFeatured: string;
  readonly allFeatured: string;
  readonly filterFeaturedOnly: string;
  readonly filterNotFeatured: string;
  readonly filterPrice: string;
  readonly allPrices: string;
  readonly filterHasPrice: string;
  readonly filterNoPrice: string;
  readonly clearFilters: string;
  readonly filtersToggle: string;
}

export interface AdminMenuItemsCategoryGroup {
  readonly mainCategoryId: string;
  /** Menu + main-category label, pre-composed by the server for disambiguation. */
  readonly label: string;
  readonly categories: readonly { readonly id: string; readonly name: string }[];
}

interface AdminMenuItemsFilterBarProps {
  readonly filters: AdminMenuItemFilterValues;
  readonly categoryGroups: readonly AdminMenuItemsCategoryGroup[];
  readonly labels: AdminMenuItemsFilterLabels;
}

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Admin menu-items filter bar. A thin Client Component that owns URL state.
 *
 * Every change maps to the page's query string (`/admin/menu-items?q=…`), which
 * is what makes the filters shareable and back-forward safe. The filtering work
 * itself stays on the server: the page reads `searchParams` and refilters the
 * rows before rendering, so no raw item rows ever ship to run a filter.
 *
 * The search input is debounced; the selects apply immediately. A client-side
 * copy of the category group data narrows the dependent category list the moment
 * a main category changes, and a category that no longer belongs is dropped from
 * the same navigation.
 *
 * On small screens the non-search controls collapse behind a toggle; from `lg`
 * they are always visible.
 */

export function AdminMenuItemsFilterBar({
  filters,
  categoryGroups,
  labels,
}: AdminMenuItemsFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const panelId = useId();

  const [search, setSearch] = useState(filters.search);
  const [open, setOpen] = useState(false);

  /** The last search value that produced a URL. Guards back/forward syncing. */
  const submittedSearch = useRef(filters.search);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, []);

  const apply = useCallback(
    (overrides: Partial<AdminMenuItemFilterValues>) => {
      const next = { ...filters, ...overrides };
      const params = new URLSearchParams();
      const trimmed = next.search.trim();

      if (trimmed) params.set("q", trimmed);
      if (next.mainCategoryId) params.set("main", next.mainCategoryId);
      if (next.categoryId) params.set("category", next.categoryId);
      if (next.availability !== "any") params.set("availability", next.availability);
      if (next.featured !== "any") params.set("featured", next.featured);
      if (next.price !== "any") params.set("price", next.price);

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  function onSearchChange(value: string) {
    setSearch(value);

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    searchTimer.current = setTimeout(() => {
      submittedSearch.current = value.trim();
      apply({ search: value });
    }, SEARCH_DEBOUNCE_MS);
  }

  function onMainCategoryChange(value: string) {
    const mainCategoryId = value || null;
    const group = mainCategoryId
      ? categoryGroups.find((g) => g.mainCategoryId === mainCategoryId)
      : null;
    const categoryId =
      group && filters.categoryId && group.categories.some((c) => c.id === filters.categoryId)
        ? filters.categoryId
        : null;
    apply({ mainCategoryId, categoryId });
  }

  function onClear() {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
    submittedSearch.current = "";
    setSearch("");
    setOpen(false);
    router.replace(pathname, { scroll: false });
  }

  const selectedGroup = filters.mainCategoryId
    ? categoryGroups.find((g) => g.mainCategoryId === filters.mainCategoryId)
    : null;
  const categoryOptions = selectedGroup?.categories ?? [];

  return (
    <div
      role="search"
      aria-label={labels.searchLabel}
      className="rounded-card border border-border bg-surface p-5 sm:p-6"
    >
      <div className="grid gap-6 sm:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* Search */}
        <div className="flex flex-col gap-2">
          <label htmlFor={`${panelId}-q`} className="text-sm font-semibold text-foreground">
            {labels.searchLabel}
          </label>
          <Input
            id={`${panelId}-q`}
            type="search"
            autoComplete="off"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={labels.searchPlaceholder}
          />
        </div>

        {/* Mobile toggle for the remaining controls */}
        <div className="flex items-end justify-end sm:hidden">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`${panelId}-controls`}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-control border border-border-strong px-4",
              "text-sm font-semibold transition-colors duration-150 ease-out",
              "hover:bg-surface-muted active:bg-border",
            )}
          >
            {labels.filtersToggle}
          </button>
        </div>
      </div>

      <div
        id={`${panelId}-controls`}
        className={cn(
          "mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4",
          open ? "grid" : "hidden",
          "lg:grid",
        )}
      >
        {/* Main category */}
        <div className="flex flex-col gap-2">
          <label htmlFor={`${panelId}-main`} className="text-sm font-semibold text-foreground">
            {labels.filterMainCategory}
          </label>
          <Select
            id={`${panelId}-main`}
            value={filters.mainCategoryId ?? ""}
            onChange={(e) => onMainCategoryChange(e.target.value)}
          >
            <option value="">{labels.allMainCategories}</option>
            {categoryGroups.map((group) => (
              <option key={group.mainCategoryId} value={group.mainCategoryId}>
                {group.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Category (dependent on main category) */}
        <div className="flex flex-col gap-2">
          <label htmlFor={`${panelId}-category`} className="text-sm font-semibold text-foreground">
            {labels.filterCategory}
          </label>
          <Select
            id={`${panelId}-category`}
            value={filters.categoryId ?? ""}
            disabled={!filters.mainCategoryId}
            onChange={(e) => apply({ categoryId: e.target.value || null })}
          >
            <option value="">{labels.allCategories}</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          {!filters.mainCategoryId ? (
            <p className="text-sm text-foreground-muted">{labels.selectMainCategoryHint}</p>
          ) : null}
        </div>

        {/* Availability */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor={`${panelId}-availability`}
            className="text-sm font-semibold text-foreground"
          >
            {labels.filterAvailability}
          </label>
          <Select
            id={`${panelId}-availability`}
            value={filters.availability}
            onChange={(e) => apply({ availability: e.target.value as AvailabilityFilter })}
          >
            <option value="any">{labels.allAvailability}</option>
            <option value="available">{labels.filterAvailableOnly}</option>
            <option value="unavailable">{labels.filterUnavailableOnly}</option>
          </Select>
        </div>

        {/* Featured */}
        <div className="flex flex-col gap-2">
          <label htmlFor={`${panelId}-featured`} className="text-sm font-semibold text-foreground">
            {labels.filterFeatured}
          </label>
          <Select
            id={`${panelId}-featured`}
            value={filters.featured}
            onChange={(e) => apply({ featured: e.target.value as FeaturedFilter })}
          >
            <option value="any">{labels.allFeatured}</option>
            <option value="featured">{labels.filterFeaturedOnly}</option>
            <option value="regular">{labels.filterNotFeatured}</option>
          </Select>
        </div>

        {/* Price status */}
        <div className="flex flex-col gap-2">
          <label htmlFor={`${panelId}-price`} className="text-sm font-semibold text-foreground">
            {labels.filterPrice}
          </label>
          <Select
            id={`${panelId}-price`}
            value={filters.price}
            onChange={(e) => apply({ price: e.target.value as PriceStatusFilter })}
          >
            <option value="any">{labels.allPrices}</option>
            <option value="has">{labels.filterHasPrice}</option>
            <option value="none">{labels.filterNoPrice}</option>
          </Select>
        </div>

        {/* Clear */}
        <div className="flex items-end sm:col-span-2 lg:col-span-4">
          {[
            filters.search.trim(),
            filters.mainCategoryId,
            filters.categoryId,
            filters.availability !== "any" ? filters.availability : null,
            filters.featured !== "any" ? filters.featured : null,
            filters.price !== "any" ? filters.price : null,
          ].some(Boolean) ? (
            <button
              type="button"
              onClick={onClear}
              className="text-sm font-semibold text-accent-ink underline decoration-accent-line decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:text-foreground"
            >
              {labels.clearFilters}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}