"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";

import { MenuItemCard } from "@/components/sections/menu-item-card";
import { Input } from "@/components/ui/input";
import { SectionNotice } from "@/components/ui/section-notice";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import {
  collectPublicMenuMainCategories,
  EMPTY_PUBLIC_MENU_FILTERS,
  filterPublicMenuBand,
  formatResultCount,
  type PublicMenuFilterValues,
  type ResultCountForms,
} from "@/lib/menu/filter";
import type {
  PublicMainCategoryWithCategories,
  PublicMenuBand,
  PublicMenuCategoryWithItems,
  PublicMenuWithMainCategories,
  PublicVenueWithMenus,
} from "@/types/content";

/* -------------------------------------------------------------------------- */
/*  Public label contract                                                     */
/* -------------------------------------------------------------------------- */

export interface MenuBrowserLabels {
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly clearFilters: string;
  readonly filterMainCategory: string;
  readonly allMainCategories: string;
  readonly filterCategory: string;
  readonly allCategories: string;
  readonly selectMainCategoryHint: string;
  readonly noResultsTitle: string;
  readonly noResultsDescription: string;
  readonly featured: string;
  /** Template containing `%name%` — substituted per item. */
  readonly openItemDetails: string;
  readonly closeItemDetails: string;
  readonly groupEmpty: { readonly title: string; readonly description: string };
  readonly countForms: ResultCountForms;
}

/* -------------------------------------------------------------------------- */
/*  Component props                                                           */
/* -------------------------------------------------------------------------- */

interface MenuBrowserProps {
  readonly locale: string;
  readonly band: PublicMenuBand;
  readonly labels: MenuBrowserLabels;
  readonly menuHeadingLevel: 2 | 3;
  readonly noticeHeadingLevel: 3 | 4;
}

/* -------------------------------------------------------------------------- */
/*  Chip skin                                                                 */
/* -------------------------------------------------------------------------- */

function chip(active: boolean): string {
  return cn(
    "shrink-0 rounded-pill border px-4 py-1.5 text-sm font-semibold transition-[border-color,background-color,color] duration-150 ease-out",
    active
      ? "border-accent bg-accent text-accent-foreground"
      : "border-border-strong bg-transparent text-foreground hover:border-accent-line hover:text-accent-ink",
  );
}

/* -------------------------------------------------------------------------- */
/*  Recursive hierarchy renderers                                             */
/* -------------------------------------------------------------------------- */

function VenueMark({ venue }: { readonly venue: PublicVenueWithMenus }) {
  return (
    <p className="flex items-center gap-3 text-eyebrow font-semibold tracking-eyebrow text-accent-ink">
      <span aria-hidden="true" className="h-px w-8 bg-accent-line" />
      <span lang="ar" dir="auto">
        {venue.name}
      </span>
    </p>
  );
}

function CategoryBlock({
  category,
  empty,
  featuredLabel,
  openTemplate,
  closeLabel,
  noticeHeadingLevel,
}: {
  readonly category: PublicMenuCategoryWithItems;
  readonly empty: { readonly title: string; readonly description: string };
  readonly featuredLabel: string;
  readonly openTemplate: string;
  readonly closeLabel: string;
  readonly noticeHeadingLevel: 3 | 4;
}) {
  const labelId = `menu-category-${category.id}`;

  return (
    <div>
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="h-px w-10 bg-accent-line" />
        <p
          id={labelId}
          lang="ar"
          dir="auto"
          className="text-sm font-semibold tracking-[0.04em] text-accent-ink"
        >
          {category.name}
        </p>
      </div>

      {category.description ? (
        <p lang="ar" dir="auto" className="mt-3 max-w-measure text-sm text-foreground-muted">
          {category.description}
        </p>
      ) : null}

      {category.items.length === 0 ? (
        <div className="mt-6">
          <SectionNotice
            size="sm"
            headingLevel={noticeHeadingLevel}
            title={empty.title}
            description={empty.description}
          />
        </div>
      ) : (
        <ul
          aria-labelledby={labelId}
          className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {category.items.map((item) => (
            <li key={item.id} className="flex">
              <MenuItemCard
                item={item}
                featuredLabel={featuredLabel}
                openLabel={openTemplate.replace("%name%", item.name)}
                closeLabel={closeLabel}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MainCategoryBlock({
  main,
  empty,
  featuredLabel,
  openTemplate,
  closeLabel,
  headingLevel,
  noticeHeadingLevel,
}: {
  readonly main: PublicMainCategoryWithCategories;
  readonly empty: { readonly title: string; readonly description: string };
  readonly featuredLabel: string;
  readonly openTemplate: string;
  readonly closeLabel: string;
  readonly headingLevel: 3 | 4;
  readonly noticeHeadingLevel: 3 | 4;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h4";

  return (
    <div>
      <Heading lang="ar" dir="auto" className="text-xl font-medium">
        {main.name}
      </Heading>

      {main.description ? (
        <p lang="ar" dir="auto" className="mt-2 max-w-measure text-sm text-foreground-muted">
          {main.description}
        </p>
      ) : null}

      <div className="mt-8 space-y-12">
        {main.categories.length === 0 ? (
          <SectionNotice
            size="sm"
            headingLevel={noticeHeadingLevel}
            title={empty.title}
            description={empty.description}
          />
        ) : (
          main.categories.map((category) => (
            <CategoryBlock
              key={category.id}
              category={category}
              empty={empty}
              featuredLabel={featuredLabel}
              openTemplate={openTemplate}
              closeLabel={closeLabel}
              noticeHeadingLevel={noticeHeadingLevel}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MenuBlock({
  menu,
  empty,
  featuredLabel,
  openTemplate,
  closeLabel,
  headingLevel,
  noticeHeadingLevel,
}: {
  readonly menu: PublicMenuWithMainCategories;
  readonly empty: { readonly title: string; readonly description: string };
  readonly featuredLabel: string;
  readonly openTemplate: string;
  readonly closeLabel: string;
  readonly headingLevel: 2 | 3;
  readonly noticeHeadingLevel: 3 | 4;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <div>
      <Heading lang="ar" dir="auto" className="text-display-sm font-medium">
        {menu.name}
      </Heading>

      {menu.description ? (
        <p lang="ar" dir="auto" className="mt-3 max-w-measure text-base text-foreground-muted">
          {menu.description}
        </p>
      ) : null}

      <div className="mt-10 space-y-12">
        {menu.mainCategories.length === 0 ? (
          <SectionNotice
            size="sm"
            headingLevel={noticeHeadingLevel}
            title={empty.title}
            description={empty.description}
          />
        ) : (
          menu.mainCategories.map((main) => (
            <MainCategoryBlock
              key={main.id}
              main={main}
              empty={empty}
              featuredLabel={featuredLabel}
              openTemplate={openTemplate}
              closeLabel={closeLabel}
              headingLevel={noticeHeadingLevel}
              noticeHeadingLevel={noticeHeadingLevel}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  MenuBrowser – the public client entry point                               */
/* -------------------------------------------------------------------------- */

export function MenuBrowser({
  locale,
  band,
  labels,
  menuHeadingLevel,
  noticeHeadingLevel,
}: MenuBrowserProps) {
  const [filters, setFilters] = useState<PublicMenuFilterValues>(
    EMPTY_PUBLIC_MENU_FILTERS,
  );

  const mainOptions = useMemo(() => collectPublicMenuMainCategories(band), [band]);

  const selectedMain = filters.mainCategoryId
    ? mainOptions.find((m) => m.id === filters.mainCategoryId) ?? null
    : null;

  const categoryOptions = useMemo(
    () => (selectedMain ? selectedMain.categories : []),
    [selectedMain],
  );

  const result = useMemo(
    () => filterPublicMenuBand(band, filters),
    [band, filters],
  );

  const deferredCount = useDeferredValue(result.itemCount);

  /* ---------- filter actions --------------------------------------------- */

  function setSearch(value: string) {
    setFilters((prev) => ({ ...prev, search: value }));
  }

  function setMain(id: string | null) {
    setFilters((prev) => ({
      ...prev,
      mainCategoryId: id,
      // Reset category when the parent changes.
      categoryId: null,
    }));
  }

  function setCategory(id: string) {
    setFilters((prev) => ({ ...prev, categoryId: id || null }));
  }

  function clear() {
    setFilters(EMPTY_PUBLIC_MENU_FILTERS);
  }

  /* ---------- local ids ------------------------------------------------- */

  const searchId = useId();
  const mainLabelId = useId();
  const categoryLabelId = useId();
  const hasActive =
    filters.search.trim().length > 0 ||
    filters.mainCategoryId !== null ||
    filters.categoryId !== null;

  const effectiveMenuLevel = menuHeadingLevel;
  const effectiveBlockLevel = effectiveMenuLevel === 2 ? 3 : 4;
  const effectiveNoticeLevel = effectiveBlockLevel;

  return (
    <div>
      {/* ---- Filter bar ---- */}
      <div className="space-y-6 rounded-card border border-border bg-surface p-5 sm:p-6">
        <div className="grid gap-6 sm:grid-cols-[minmax(0,16rem)_1fr] sm:items-end">
          {/* Search */}
          <div className="flex flex-col gap-2">
            <label htmlFor={searchId} className="text-sm font-semibold text-foreground">
              {labels.searchLabel}
            </label>
            <Input
              id={searchId}
              type="search"
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={labels.searchPlaceholder}
            />
          </div>

          {/* Category (dependent) */}
          <div className="flex flex-col gap-2">
            <label htmlFor={categoryLabelId} className="text-sm font-semibold text-foreground">
              {labels.filterCategory}
            </label>
            <Select
              id={categoryLabelId}
              value={filters.categoryId ?? ""}
              disabled={!filters.mainCategoryId}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{labels.allCategories}</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {!filters.mainCategoryId ? (
              <p className="text-sm text-foreground-muted">{labels.selectMainCategoryHint}</p>
            ) : null}
          </div>
        </div>

        {/* Main-category chips (horizontally scrollable) */}
        <div>
          <p id={mainLabelId} className="text-sm font-semibold text-foreground">
            {labels.filterMainCategory}
          </p>
          <div
            role="group"
            aria-labelledby={mainLabelId}
            className="mt-3 flex gap-2 overflow-x-auto pb-1"
          >
            <button
              type="button"
              aria-pressed={filters.mainCategoryId === null}
              onClick={() => setMain(null)}
              className={chip(filters.mainCategoryId === null)}
            >
              {labels.allMainCategories}
            </button>
            {mainOptions.map((main) => (
              <button
                key={main.id}
                type="button"
                lang="ar"
                dir="auto"
                aria-pressed={filters.mainCategoryId === main.id}
                onClick={() => setMain(main.id)}
                className={chip(filters.mainCategoryId === main.id)}
              >
                {main.name}
              </button>
            ))}
          </div>
        </div>

        {/* Clear */}
        {hasActive ? (
          <div>
            <button
              type="button"
              onClick={clear}
              className="text-sm font-semibold text-accent-ink underline decoration-accent-line decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:text-foreground"
            >
              {labels.clearFilters}
            </button>
          </div>
        ) : null}
      </div>

      {/* ---- Count + results ---- */}
      <p role="status" aria-live="polite" className="mt-8 text-sm text-foreground-muted">
        {formatResultCount(locale, deferredCount, labels.countForms)}
      </p>

      <div className="mt-8">
        {result.band.venues.length === 0 ? (
          <SectionNotice
            headingLevel={noticeHeadingLevel}
            title={labels.noResultsTitle}
            description={labels.noResultsDescription}
          />
        ) : (
          <div className="space-y-16">
            {result.band.venues.map((venue) => (
              <div key={venue.id}>
                {result.band.venues.length > 1 ? <VenueMark venue={venue} /> : null}
                <div
                  className={
                    result.band.venues.length > 1 ? "mt-8 space-y-12" : "space-y-12"
                  }
                >
                  {venue.menus.map((menu) => (
                    <MenuBlock
                      key={menu.id}
                      menu={menu}
                      empty={labels.groupEmpty}
                      featuredLabel={labels.featured}
                      openTemplate={labels.openItemDetails}
                      closeLabel={labels.closeItemDetails}
                      headingLevel={effectiveMenuLevel}
                      noticeHeadingLevel={effectiveNoticeLevel}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
