import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { MenuBrowser, type MenuBrowserLabels } from "@/components/sections/menu-browser";
import { Section } from "@/components/ui/section";
import { SectionHeading, type SectionHeadingLevel } from "@/components/ui/section-heading";
import { SectionNotice } from "@/components/ui/section-notice";
import { SECTION_IDS } from "@/lib/constants/sections";
import type { ResultCountForms } from "@/lib/menu/filter";
import type { QueryResult } from "@/lib/supabase/result";
import type { PublicMenuBand } from "@/types/content";

/**
 * The full public menu page body: heading plus an interactive browser.
 *
 * The server component owns the SEO surface - the `<Section>` heading and the
 * error/empty query states, which no client code could decide - and hands the
 * successful band to `MenuBrowser`, the client component that carries search and
 * main/category filtering over the already-fetched static data.
 *
 * The hierarchy rendering lives in `MenuBrowser` now (venue → menu → main
 * category → labelled category → item grid), because filtering can only hide
 * published structure after the visitor types. The server never re-queries
 * Supabase per keystroke; the full band is fetched once at build time and the
 * client narrows it in memory.
 *
 * HEADINGS. The section heading stays the page's `h1`; menus follow at `h2`
 * inside the browser, main categories at `h3`. Categories are deliberately not
 * headings: they are labelled groups.
 *
 * Database text (names and descriptions) carries `lang="ar" dir="auto"`
 * throughout, so it renders correctly in either catalogue.
 */

interface MenuSectionProps {
  readonly locale: Locale;
  readonly result: QueryResult<PublicMenuBand>;
  /** `1` on the dedicated menu page (its only h1). */
  readonly headingLevel?: SectionHeadingLevel;
}

const HEADING_ID = "menu-heading";

function buildCountForms(t: {
  (key: "resultCountZero"): string;
  (key: "resultCountOne"): string;
  (key: "resultCountTwo"): string;
  (key: "resultCountFew"): string;
  (key: "resultCountMany"): string;
  (key: "resultCountOther"): string;
}): ResultCountForms {
  return {
    zero: t("resultCountZero"),
    one: t("resultCountOne"),
    two: t("resultCountTwo"),
    few: t("resultCountFew"),
    many: t("resultCountMany"),
    other: t("resultCountOther"),
  };
}

export async function MenuSection({ locale, result, headingLevel = 2 }: MenuSectionProps) {
  const t = await getTranslations({ locale, namespace: "menu" });

  const menuHeadingLevel = headingLevel === 1 ? 2 : 3;
  const noticeHeadingLevel = (menuHeadingLevel === 2 ? 3 : 4) as 3 | 4;

  const labels: MenuBrowserLabels = {
    searchLabel: t("searchLabel"),
    searchPlaceholder: t("searchPlaceholder"),
    clearFilters: t("clearFilters"),
    filterMainCategory: t("filterMainCategory"),
    allMainCategories: t("allMainCategories"),
    filterCategory: t("filterCategory"),
    allCategories: t("allCategories"),
    selectMainCategoryHint: t("selectMainCategoryHint"),
    noResultsTitle: t("noResultsTitle"),
    noResultsDescription: t("noResultsDescription"),
    featured: t("featured"),
    openItemDetails: t("openItemDetails"),
    closeItemDetails: t("closeItemDetails"),
    groupEmpty: {
      title: t("groupEmptyTitle"),
      description: t("groupEmptyDescription"),
    },
    countForms: buildCountForms(t),
  };

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
          <MenuBrowser
            locale={locale}
            band={result.data}
            labels={labels}
            menuHeadingLevel={menuHeadingLevel}
            noticeHeadingLevel={noticeHeadingLevel}
          />
        )}
      </div>
    </Section>
  );
}