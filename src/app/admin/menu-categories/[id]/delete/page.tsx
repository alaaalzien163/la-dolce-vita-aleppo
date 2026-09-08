import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { deleteMenuCategory } from "@/app/admin/menu-categories/actions";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import {
  buildParentLabelLookup,
  getAdminMenuCategory,
  listAdminCategoryParentGroups,
} from "@/lib/data/admin/menu-categories";

/**
 * Delete confirmation.
 *
 * A separate page rather than a dialog, and that choice does more than avoid a modal library.
 * Deletion needs two deliberate steps, and a page gives that for free: the list links here
 * with a GET, and only the button on this page issues the POST that destroys anything. No
 * stray click, no misplaced Enter, and no double-submit can delete a category, because the
 * destructive endpoint is never one keystroke away from a focused row.
 *
 * It is also the most accessible option available: real focus order, real back button, no
 * focus trap to get wrong, and it works with JavaScript disabled. `window.confirm` would have
 * been fewer lines but it cannot be styled, cannot be translated reliably, and is suppressible
 * in some browsers - which would turn a suppressed dialog into a one-click delete.
 *
 * The record is shown before it is destroyed, including its parent chain, so the admin is
 * confirming a specific category rather than an id they cannot verify. A category that still
 * has `menu_items` attached is refused by the foreign-key constraint, and the list explains
 * that rather than reporting a deletion that did not happen.
 */
export const dynamic = "force-dynamic";

interface DeleteMenuCategoryPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function DeleteMenuCategoryPage({ params }: DeleteMenuCategoryPageProps) {
  await requireAdmin();

  const [{ id }, locale] = await Promise.all([params, getAdminLocale()]);
  const [t, categoryResult, parentsResult] = await Promise.all([
    getTranslations({ locale, namespace: "adminMenuCategories" }),
    getAdminMenuCategory(id),
    listAdminCategoryParentGroups(),
  ]);

  const parentLookup = buildParentLabelLookup(
    parentsResult.status === "success" ? parentsResult.data : [],
  );

  const existing = categoryResult.status === "success" ? categoryResult.data : null;
  const parent = existing ? parentLookup.get(existing.main_category_id) : undefined;

  return (
    <main className="py-section">
      <Container width="measure">
        <nav aria-label={t("backToCategories")} className="mb-8">
          <Link
            href="/admin/menu-categories"
            className="text-sm underline decoration-accent-line decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:text-accent-ink"
          >
            {t("backToCategories")}
          </Link>
        </nav>

        {/* Rendered in every branch, so the page always has exactly one h1 - including when
            the record has already been deleted from another tab. */}
        <h1 className="text-display-sm font-medium">{t("confirmDeleteTitle")}</h1>

        {categoryResult.status === "success" ? (
          <>
            <p className="mt-4 text-sm text-foreground-muted">{t("confirmDeleteDescription")}</p>

            <div className="mt-8 rounded-card border border-border bg-surface p-6">
              <dl className="flex flex-col gap-4 text-sm">
                <div>
                  <dt className="text-foreground-muted">{t("colName")}</dt>
                  <dd lang="ar" dir="rtl" className="mt-1 font-medium">
                    {categoryResult.data.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">{t("colMainCategory")}</dt>
                  <dd lang="ar" dir="rtl" className="mt-1 font-medium">
                    {parent?.mainCategoryName ?? t("unknownMainCategory")}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">{t("colMenu")}</dt>
                  <dd lang="ar" dir="rtl" className="mt-1 font-medium">
                    {parent?.menuName ?? t("unknownMenu")}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">{t("colSlug")}</dt>
                  <dd dir="ltr" className="mt-1 font-medium">
                    {categoryResult.data.slug}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">{t("colStatus")}</dt>
                  <dd className="mt-1 font-medium">
                    {categoryResult.data.is_active ? t("statusActive") : t("statusInactive")}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {/* The only POST that deletes anything. */}
              <form action={deleteMenuCategory}>
                <input type="hidden" name="id" value={categoryResult.data.id} />
                <button type="submit" className={buttonStyles({ variant: "emphasis" })}>
                  {t("confirmDeleteButton")}
                </button>
              </form>
              <Link href="/admin/menu-categories" className={buttonStyles({ variant: "ghost" })}>
                {t("cancel")}
              </Link>
            </div>
          </>
        ) : categoryResult.status === "empty" ? (
          <div className="mt-8">
            <SectionNotice
              title={t("notFoundTitle")}
              description={t("notFoundDescription")}
              headingLevel={3}
            />
          </div>
        ) : (
          <div className="mt-8">
            <SectionNotice
              tone="error"
              title={t("errorTitle")}
              description={t("errorDescription")}
              headingLevel={3}
            />
          </div>
        )}
      </Container>
    </main>
  );
}
