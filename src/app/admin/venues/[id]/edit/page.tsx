import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { updateVenue } from "@/app/admin/venues/actions";
import { getVenueFormLabels } from "@/app/admin/venues/form-labels";
import { VenueForm } from "@/app/admin/venues/venue-form";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminVenue, listAdminVenueSections } from "@/lib/data/admin/venues";

/**
 * Edit a venue.
 *
 * A missing row renders a notice rather than calling `notFound()`, because reaching this
 * URL after deleting the venue from another tab is ordinary, not exceptional - and the
 * admin's own not-found page would drop them out of the dashboard shell.
 */
export const dynamic = "force-dynamic";

interface EditVenuePageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function EditVenuePage({ params }: EditVenuePageProps) {
  await requireAdmin();

  const [{ id }, locale] = await Promise.all([params, getAdminLocale()]);
  const [t, { labels }, venueResult, sectionsResult] = await Promise.all([
    getTranslations({ locale, namespace: "adminVenues" }),
    getVenueFormLabels(),
    getAdminVenue(id),
    listAdminVenueSections(),
  ]);

  const sections = sectionsResult.status === "success" ? sectionsResult.data : [];

  return (
    <main className="py-section">
      <Container>
        <nav aria-label={t("backToVenues")} className="mb-8">
          <Link
            href="/admin/venues"
            className="text-sm underline decoration-accent-line decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:text-accent-ink"
          >
            {t("backToVenues")}
          </Link>
        </nav>

        <h1 className="text-display-sm font-medium">{t("editVenue")}</h1>

        <div className="mt-10">
          {venueResult.status === "success" && sectionsResult.status === "success" ? (
            <VenueForm
              action={updateVenue}
              labels={labels}
              sections={sections}
              cancelHref="/admin/venues"
              venue={venueResult.data}
            />
          ) : (
            <>
              {venueResult.status === "empty" ? (
                <SectionNotice
                  title={t("notFoundTitle")}
                  description={t("notFoundDescription")}
                  headingLevel={3}
                />
              ) : (
                <SectionNotice
                  tone="error"
                  title={t("errorTitle")}
                  description={t("errorDescription")}
                  headingLevel={3}
                />
              )}
              {sectionsResult.status === "error" || sections.length === 0 ? (
                <div className="mt-4">
                  <SectionNotice
                    title={t("noSectionsTitle")}
                    description={t("noSectionsDescription")}
                    headingLevel={3}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </Container>
    </main>
  );
}
