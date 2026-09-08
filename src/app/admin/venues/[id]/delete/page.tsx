import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { deleteVenue } from "@/app/admin/venues/actions";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminVenue, listAdminVenueSections } from "@/lib/data/admin/venues";

/**
 * Delete confirmation.
 *
 * A separate page rather than a dialog, and that choice does more than avoid a modal
 * library. Deletion needs two deliberate steps, and a page gives that for free: the list
 * links here with a GET, and only the button on this page issues the POST that destroys
 * anything. No stray click, no misplaced Enter, and no double-submit can delete a venue,
 * because the destructive endpoint is never one keystroke away from a focused row.
 *
 * It is also the most accessible option available: real focus order, real back button, no
 * focus trap to get wrong, and it works with JavaScript disabled. `window.confirm` would
 * have been fewer lines but it cannot be styled, cannot be translated reliably, and is
 * suppressible in some browsers - which would turn a suppressed dialog into a one-click
 * delete.
 *
 * The record is shown before it is destroyed, so the admin is confirming a specific venue
 * rather than an id they cannot verify. If other rows reference this venue, the delete
 * itself is refused by the foreign-key constraint and the list explains why.
 */
export const dynamic = "force-dynamic";

interface DeleteVenuePageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function DeleteVenuePage({ params }: DeleteVenuePageProps) {
  await requireAdmin();

  const [{ id }, locale] = await Promise.all([params, getAdminLocale()]);
  const [t, venueResult, sectionsResult] = await Promise.all([
    getTranslations({ locale, namespace: "adminVenues" }),
    getAdminVenue(id),
    listAdminVenueSections(),
  ]);

  const sectionNames = new Map<string, string>();
  if (sectionsResult.status === "success") {
    for (const section of sectionsResult.data) {
      sectionNames.set(section.id, section.name);
    }
  }

  const existing = venueResult.status === "success" ? venueResult.data : null;
  const sectionName = existing
    ? (sectionNames.get(existing.section_id) ?? t("unknownSection"))
    : null;

  return (
    <main className="py-section">
      <Container width="measure">
        <nav aria-label={t("backToVenues")} className="mb-8">
          <Link
            href="/admin/venues"
            className="text-sm underline decoration-accent-line decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:text-accent-ink"
          >
            {t("backToVenues")}
          </Link>
        </nav>

        {/* Rendered in every branch, so the page always has exactly one h1 - including when
            the record has already been deleted from another tab. */}
        <h1 className="text-display-sm font-medium">{t("confirmDeleteTitle")}</h1>

        {venueResult.status === "success" ? (
          <>
            <p className="mt-4 text-sm text-foreground-muted">{t("confirmDeleteDescription")}</p>

            <div className="mt-8 rounded-card border border-border bg-surface p-6">
              <dl className="flex flex-col gap-4 text-sm">
                <div>
                  <dt className="text-foreground-muted">{t("colName")}</dt>
                  <dd lang="ar" dir="rtl" className="mt-1 font-medium">
                    {venueResult.data.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">{t("colSection")}</dt>
                  <dd lang="ar" dir="rtl" className="mt-1 font-medium">
                    {sectionName}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">{t("colSlug")}</dt>
                  <dd dir="ltr" className="mt-1 font-medium">
                    {venueResult.data.slug}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">{t("colStatus")}</dt>
                  <dd className="mt-1 font-medium">
                    {venueResult.data.is_active ? t("statusActive") : t("statusInactive")}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {/* The only POST that deletes anything. */}
              <form action={deleteVenue}>
                <input type="hidden" name="id" value={venueResult.data.id} />
                <button type="submit" className={buttonStyles({ variant: "emphasis" })}>
                  {t("confirmDeleteButton")}
                </button>
              </form>
              <Link href="/admin/venues" className={buttonStyles({ variant: "ghost" })}>
                {t("cancel")}
              </Link>
            </div>
          </>
        ) : venueResult.status === "empty" ? (
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
