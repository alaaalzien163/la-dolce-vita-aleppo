import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { DepartmentCard } from "@/components/sections/department-card";
import { buttonStyles } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { SectionHeading, type SectionHeadingLevel } from "@/components/ui/section-heading";
import { SectionNotice } from "@/components/ui/section-notice";
import { getPathname } from "@/i18n/navigation";
import { SECTION_IDS } from "@/lib/constants/sections";
import type { QueryResult } from "@/lib/supabase/result";
import type { PublicDepartment } from "@/types/content";

/**
 * Departments - homepage preview or dedicated page body, backed by `public.sections`.
 *
 * Purely presentational: it receives an already-resolved `QueryResult` and never
 * touches Supabase itself. The page performs the query.
 *
 * CONTEXT. The same component serves two contexts through props:
 *
 *   - The homepage band passes `headingLevel={2}` and a `previewCount`: it renders
 *     that many publishable departments (never the whole dataset) followed by a
 *     "View all departments" CTA that links to the dedicated page.
 *   - The `/departments` page passes `headingLevel={1}` and no `previewCount`: it
 *     renders every publishable department as the full view.
 *
 * FOUR OUTCOMES, all distinct on purpose:
 *
 *   error    the query failed. Says so plainly, without exposing why - the reason is
 *            already in the server log.
 *   empty    no row is publicly visible. Nothing is wrong; nothing is published.
 *   pending  rows exist but none carries publishable content (see below).
 *   success  at least one publishable department, rendered as a grid.
 *
 * WHY `pending` EXISTS. A department with a name and nothing else is a record, not
 * content. A department is treated as publishable when it has a description or an
 * image; if none qualify, the section shows a quiet placeholder instead of a grid
 * of bare words. This is a content rule, not a security rule - nothing is
 * fabricated, and name-only records are never presented as curated copy.
 *
 * The threshold is one line - `isPublishable` - if the editorial decision changes
 * and name-only departments should render, invert it there and nothing else moves.
 */

interface DepartmentsProps {
  readonly locale: Locale;
  readonly result: QueryResult<readonly PublicDepartment[]>;
  /** `1` on the dedicated departments page, `2` on the homepage band. */
  readonly headingLevel?: SectionHeadingLevel;
  /** When set, only this many publishable departments render (homepage preview). */
  readonly previewCount?: number;
}

const HEADING_ID = "departments-heading";

/** A department worth showing: it has something to read or something to look at. */
function isPublishable(department: PublicDepartment): boolean {
  return Boolean(department.description ?? department.previewImageUrl);
}

export async function Departments({
  locale,
  result,
  headingLevel = 2,
  previewCount,
}: DepartmentsProps) {
  const t = await getTranslations({ locale, namespace: "departments" });

  const publishable = result.status === "success" ? result.data.filter(isPublishable) : [];
  const visible = previewCount !== undefined ? publishable.slice(0, previewCount) : publishable;
  const hasMore = previewCount !== undefined && publishable.length > previewCount;

  // Card and notice levels follow the enclosing heading so no level is skipped.
  const cardLevel = headingLevel === 1 ? 2 : 3;
  const noticeLevel = headingLevel === 1 ? 2 : 3;

  return (
    <Section id={SECTION_IDS.departments} labelledBy={HEADING_ID}>
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
            headingLevel={noticeLevel}
            tone="error"
            title={t("errorTitle")}
            description={t("errorDescription")}
          />
        ) : result.status === "empty" ? (
          <SectionNotice
            headingLevel={noticeLevel}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : publishable.length === 0 ? (
          <SectionNotice
            headingLevel={noticeLevel}
            title={t("pendingTitle")}
            description={t("pendingDescription")}
          />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {visible.map((department) => (
                <li key={department.id} className="flex">
                  <DepartmentCard
                    locale={locale}
                    department={department}
                    headingLevel={cardLevel}
                  />
                </li>
              ))}
            </ul>

            {hasMore ? (
              <p className="mt-10 text-center">
                <a
                  href={getPathname({ href: "/departments", locale })}
                  className={buttonStyles({ variant: "secondary" })}
                >
                  {t("cta")}
                </a>
              </p>
            ) : null}
          </>
        )}
      </div>
    </Section>
  );
}
