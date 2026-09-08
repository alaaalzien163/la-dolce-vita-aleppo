import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { deleteMenuItem } from "@/app/admin/menu-items/actions";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import {
  buildItemCategoryLabelLookup,
  getAdminMenuItem,
  listAdminItemCategoryGroups,
} from "@/lib/data/admin/menu-items";

/**
 * Delete confirmation.
 *
 * A separate page rather than a dialog, and that choice does more than avoid a modal library.
 * Deletion needs two deliberate steps, and a page gives that for free: the list links here with a
 * GET, and only the button on this page issues the POST that destroys anything. No stray click, no
 * misplaced Enter, and no double-submit can delete a dish, because the destructive endpoint is
 * never one keystroke away from a focused row.
 *
 * It is also the most accessible option available: real focus order, real back button, no focus
 * trap to get wrong, and it works with JavaScript disabled. `window.confirm` would have been fewer
 * lines but it cannot be styled, cannot be translated reliably, and is suppressible in some
 * browsers - which would turn a suppressed dialog into a one-click delete.
 *
 * The record is shown before it is destroyed - photograph, full ancestry, and price - so the admin
 * is confirming a specific dish rather than an id they cannot verify.
 */
export const dynamic = "force-dynamic";

interface DeleteMenuItemPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function DeleteMenuItemPage({ params }: DeleteMenuItemPageProps) {
  await requireAdmin();

  const [{ id }, locale] = await Promise.all([params, getAdminLocale()]);
  const [t, itemResult, groupsResult] = await Promise.all([
    getTranslations({ locale, namespace: "adminMenuItems" }),
    getAdminMenuItem(id),
    listAdminItemCategoryGroups(),
  ]);

  const categoryLookup = buildItemCategoryLabelLookup(
    groupsResult.status === "success" ? groupsResult.data : [],
  );

  const existing = itemResult.status === "success" ? itemResult.data : null;
  const ancestry = existing ? categoryLookup.get(existing.category_id) : undefined;

  return (
    <main className="py-section">
      <Container width="measure">
        <nav aria-label={t("backToItems")} className="mb-8">
          <Link
            href="/admin/menu-items"
            className="text-sm underline decoration-accent-line decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:text-accent-ink"
          >
            {t("backToItems")}
          </Link>
        </nav>

        {/* Rendered in every branch, so the page always has exactly one h1 - including when the
            record has already been deleted from another tab. */}
        <h1 className="text-display-sm font-medium">{t("confirmDeleteTitle")}</h1>

        {itemResult.status === "success" ? (
          <>
            <p className="mt-4 text-sm text-foreground-muted">{t("confirmDeleteDescription")}</p>

            <div className="mt-8 rounded-card border border-border bg-surface p-6">
              {itemResult.data.image_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={itemResult.data.image_url}
                    alt={itemResult.data.name}
                    className="mb-6 h-32 w-auto rounded-card border border-border object-cover"
                  />
                </>
              ) : null}

              <dl className="flex flex-col gap-4 text-sm">
                <div>
                  <dt className="text-foreground-muted">{t("colName")}</dt>
                  <dd lang="ar" dir="rtl" className="mt-1 font-medium">
                    {itemResult.data.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">{t("colCategory")}</dt>
                  <dd lang="ar" dir="rtl" className="mt-1 font-medium">
                    {ancestry?.categoryName ?? t("unknownCategory")}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">{t("colMainCategory")}</dt>
                  <dd lang="ar" dir="rtl" className="mt-1 font-medium">
                    {ancestry?.mainCategoryName ?? t("unknownMainCategory")}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">{t("colMenu")}</dt>
                  <dd lang="ar" dir="rtl" className="mt-1 font-medium">
                    {ancestry?.menuName ?? t("unknownMenu")}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">{t("colPrice")}</dt>
                  <dd dir="ltr" className="mt-1 font-medium">
                    {itemResult.data.price} {itemResult.data.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">{t("colStatus")}</dt>
                  <dd className="mt-1 font-medium">
                    {itemResult.data.is_available ? t("statusAvailable") : t("statusUnavailable")}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {/* The only POST that deletes anything. */}
              <form action={deleteMenuItem}>
                <input type="hidden" name="id" value={itemResult.data.id} />
                <button type="submit" className={buttonStyles({ variant: "emphasis" })}>
                  {t("confirmDeleteButton")}
                </button>
              </form>
              <Link href="/admin/menu-items" className={buttonStyles({ variant: "ghost" })}>
                {t("cancel")}
              </Link>
            </div>
          </>
        ) : itemResult.status === "empty" ? (
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
