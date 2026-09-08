import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { createVenue } from "@/app/admin/venues/actions";
import { getVenueFormLabels } from "@/app/admin/venues/form-labels";
import { VenueForm } from "@/app/admin/venues/venue-form";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminVenueSections } from "@/lib/data/admin/venues";

/** Create a venue. Guarded before render; the action re-checks independently. */
export const dynamic = "force-dynamic";

export default async function NewVenuePage() {
  await requireAdmin();

  const locale = await getAdminLocale();
  const [t, { labels }, sectionsResult] = await Promise.all([
    getTranslations({ locale, namespace: "adminVenues" }),
    getVenueFormLabels(),
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

        <h1 className="text-display-sm font-medium">{t("newVenue")}</h1>

        <div className="mt-10">
          {sectionsResult.status === "error" ? (
            <SectionNotice
              tone="error"
              title={t("errorTitle")}
              description={t("errorDescription")}
              headingLevel={3}
            />
          ) : sections.length === 0 ? (
            <SectionNotice
              title={t("noSectionsTitle")}
              description={t("noSectionsDescription")}
              headingLevel={3}
            />
          ) : (
            <VenueForm
              action={createVenue}
              labels={labels}
              sections={sections}
              cancelHref="/admin/venues"
            />
          )}
        </div>
      </Container>
    </main>
  );
}
