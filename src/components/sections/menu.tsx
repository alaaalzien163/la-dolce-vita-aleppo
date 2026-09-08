import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { MenuItemCard } from "@/components/sections/menu-item-card";
import { Section } from "@/components/ui/section";
import { SectionHeading, type SectionHeadingLevel } from "@/components/ui/section-heading";
import { SectionNotice } from "@/components/ui/section-notice";
import { SECTION_IDS } from "@/lib/constants/sections";
import type { QueryResult } from "@/lib/supabase/result";
import type {
  PublicMainCategoryWithCategories,
  PublicMenuBand,
  PublicMenuCategoryWithItems,
  PublicMenuWithMainCategories,
  PublicVenueWithMenus,
} from "@/types/content";

/**
 * The full public menu, backed by `getPublicMenuBand` and the complete public menu
 * hierarchy: venue, menu, main category, category, item.
 *
 * Purely presentational, like every section: it receives an already-resolved
 * `QueryResult` and never touches Supabase itself. It is the dedicated `/menu`
 * page body - it is NOT rendered on the homepage, which only carries a small CTA
 * teaser (see `MenuPreview`) so the entire dataset is never fetched for a preview.
 *
 * THE HIERARCHY IS THE UI. Each venue holds its menus, each menu its main
 * categories, each main category its labelled category groups, each category its
 * item grid. Nothing is flattened into one list - a visitor reading "meze, grill,
 * desserts" expects to find those under their menu, not in a single alphabetical
 * run.
 *
 * HEADINGS. The component heading is `h1` on the page (`headingLevel={1}`);
 * menus follow at `h2`, main categories at `h3`. Categories are deliberately not
 * headings: they are labelled groups - a small gold-ruled label with
 * `aria-labelledby` on its item list - so screen readers get the menu → main →
 * category → items relationship as a labelled list, not a heading staircase.
 *
 * EMPTINESS, AT EVERY LEVEL. Categories with no items, main categories with no
 * categories, and menus with no main categories each keep their place and show a
 * compact quiet notice where their content would be - the published structure
 * stays visible, and only the missing leaf is marked. Venues without any menu and
 * a band with no venues at all collapse to the band-level empty state. A failed
 * query is the one loud case, and it says only that the menu is unavailable -
 * never why.
 *
 * VENUE CONTEXT. A venue only gets a label when there is more than one, since a
 * single-venue menu needs no umbrellas - the label would be a whisper of the
 * obvious. The label is `p`, not a heading: menus are the headings.
 *
 * Database text (names and descriptions) carries `lang="ar"` and `dir="auto"`
 * throughout, so it renders correctly in either catalogue.
 */

interface MenuSectionProps {
  readonly locale: Locale;
  readonly result: QueryResult<PublicMenuBand>;
  /** `1` on the dedicated menu page (its only h1). */
  readonly headingLevel?: SectionHeadingLevel;
}

const HEADING_ID = "menu-heading";

/** The empty-within-a-place notice, narrow enough to leave the surrounding
    published content dominant. */
interface EmptyNoticeCopy {
  readonly title: string;
  readonly description: string;
}

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

interface CategoryBlockProps {
  readonly category: PublicMenuCategoryWithItems;
  readonly empty: EmptyNoticeCopy;
  readonly featuredLabel: string;
  readonly openItemLabel: (name: string) => string;
  readonly closeItemLabel: string;
  readonly noticeHeadingLevel: 3 | 4;
}

function CategoryBlock({
  category,
  empty,
  featuredLabel,
  openItemLabel,
  closeItemLabel,
  noticeHeadingLevel,
}: CategoryBlockProps) {
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
                openLabel={openItemLabel(item.name)}
                closeLabel={closeItemLabel}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface MainCategoryBlockProps {
  readonly main: PublicMainCategoryWithCategories;
  readonly empty: EmptyNoticeCopy;
  readonly featuredLabel: string;
  readonly openItemLabel: (name: string) => string;
  readonly closeItemLabel: string;
  readonly headingLevel: 3 | 4;
  readonly noticeHeadingLevel: 3 | 4;
}

function MainCategoryBlock({
  main,
  empty,
  featuredLabel,
  openItemLabel,
  closeItemLabel,
  headingLevel,
  noticeHeadingLevel,
}: MainCategoryBlockProps) {
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
              openItemLabel={openItemLabel}
              closeItemLabel={closeItemLabel}
              noticeHeadingLevel={noticeHeadingLevel}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface MenuBlockProps {
  readonly menu: PublicMenuWithMainCategories;
  readonly empty: EmptyNoticeCopy;
  readonly featuredLabel: string;
  readonly openItemLabel: (name: string) => string;
  readonly closeItemLabel: string;
  readonly headingLevel: 2 | 3;
  readonly noticeHeadingLevel: 3 | 4;
}

function MenuBlock({
  menu,
  empty,
  featuredLabel,
  openItemLabel,
  closeItemLabel,
  headingLevel,
  noticeHeadingLevel,
}: MenuBlockProps) {
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
              openItemLabel={openItemLabel}
              closeItemLabel={closeItemLabel}
              headingLevel={noticeHeadingLevel}
              noticeHeadingLevel={noticeHeadingLevel}
            />
          ))
        )}
      </div>
    </div>
  );
}

export async function MenuSection({ locale, result, headingLevel = 2 }: MenuSectionProps) {
  const t = await getTranslations({ locale, namespace: "menu" });

  const venues = result.status === "success" ? result.data.venues : [];
  const showVenueContext = venues.length > 1;

  const menuHeadingLevel = headingLevel === 1 ? 2 : 3;
  const innerHeadingLevel = menuHeadingLevel === 2 ? 3 : 4;
  const noticeHeadingLevel = innerHeadingLevel as 3 | 4;

  // Shared by every nested block, so a populated band needs only two quiet
  // notices copied down instead of a translation lookup per block.
  const empty: EmptyNoticeCopy = {
    title: t("groupEmptyTitle"),
    description: t("groupEmptyDescription"),
  };
  const featuredLabel = t("featured");
  const openItemLabel = (name: string) => t("openItemDetails", { name });
  const closeItemLabel = t("closeItemDetails");

  return (
    <Section id={SECTION_IDS.menu} labelledBy={HEADING_ID}>
      <SectionHeading
        id={HEADING_ID}
        level={headingLevel}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <div className="mt-12">
        {result.status === "error" ? (
          <SectionNotice
            headingLevel={menuHeadingLevel}
            tone="error"
            title={t("errorTitle")}
            description={t("errorDescription")}
          />
        ) : result.status === "empty" ? (
          <SectionNotice
            headingLevel={menuHeadingLevel}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : (
          <div className="space-y-16">
            {venues.map((venue) => (
              <div key={venue.id}>
                {showVenueContext ? <VenueMark venue={venue} /> : null}
                <div className={showVenueContext ? "mt-8 space-y-12" : "space-y-12"}>
                  {venue.menus.map((menu) => (
                    <MenuBlock
                      key={menu.id}
                      menu={menu}
                      empty={empty}
                      featuredLabel={featuredLabel}
                      openItemLabel={openItemLabel}
                      closeItemLabel={closeItemLabel}
                      headingLevel={menuHeadingLevel}
                      noticeHeadingLevel={noticeHeadingLevel}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}
