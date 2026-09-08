import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { updateSection } from "@/app/admin/sections/actions";
import { getSectionFormLabels } from "@/app/admin/sections/form-labels";
import { SectionForm } from "@/app/admin/sections/section-form";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminSection } from "@/lib/data/admin/sections";

/**
 * Edit a section.
 *
 * A missing row renders a notice rather than calling `notFound()`, because reaching this
 * URL after deleting the section from another tab is ordinary, not exceptional - and the
 * admin's own not-found page would drop them out of the dashboard shell.
 */
export const dynamic = "force-dynamic";

interface EditSectionPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function EditSectionPage({ params }: EditSectionPageProps) {
  await requireAdmin();

  const [{ id }, locale] = await Promise.all([params, getAdminLocale()]);
  const [t, { labels, uploadAvailable }, result] = await Promise.all([
    getTranslations({ locale, namespace: "adminSections" }),
    getSectionFormLabels(),
    getAdminSection(id),
  ]);

  return (
    <main className="py-section">
      <Container>
        <nav aria-label={t("backToSections")} className="mb-8">
          <Link
            href="/admin/sections"
            className="text-sm underline decoration-accent-line decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:text-accent-ink"
          >
            {t("backToSections")}
          </Link>
        </nav>

        <h1 className="text-display-sm font-medium">{t("editSection")}</h1>

        <div className="mt-10">
          {result.status === "success" ? (
            <SectionForm
              action={updateSection}
              labels={labels}
              uploadAvailable={uploadAvailable}
              cancelHref="/admin/sections"
              section={result.data}
            />
          ) : result.status === "empty" ? (
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
        </div>
      </Container>
    </main>
  );
}
