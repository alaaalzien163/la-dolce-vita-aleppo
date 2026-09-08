import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { createSection } from "@/app/admin/sections/actions";
import { getSectionFormLabels } from "@/app/admin/sections/form-labels";
import { SectionForm } from "@/app/admin/sections/section-form";
import { Container } from "@/components/ui/container";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";

/** Create a section. Guarded before render; the action re-checks independently. */
export const dynamic = "force-dynamic";

export default async function NewSectionPage() {
  await requireAdmin();

  const locale = await getAdminLocale();
  const [t, { labels, uploadAvailable }] = await Promise.all([
    getTranslations({ locale, namespace: "adminSections" }),
    getSectionFormLabels(),
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

        <h1 className="text-display-sm font-medium">{t("newSection")}</h1>

        <div className="mt-10">
          <SectionForm
            action={createSection}
            labels={labels}
            uploadAvailable={uploadAvailable}
            cancelHref="/admin/sections"
          />
        </div>
      </Container>
    </main>
  );
}
