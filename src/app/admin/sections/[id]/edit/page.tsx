import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { updateSection } from "@/app/admin/sections/actions";
import {
  deleteSectionMediaAction,
  moveSectionMediaAction,
  toggleSectionMediaAction,
  uploadSectionMediaAction,
} from "@/app/admin/sections/media-actions";
import { getSectionMediaLabels } from "@/app/admin/sections/media-form-labels";
import { getSectionFormLabels } from "@/app/admin/sections/form-labels";
import { SectionForm } from "@/app/admin/sections/section-form";
import { SectionMediaManager } from "@/app/admin/sections/section-media-manager";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminSection } from "@/lib/data/admin/sections";
import { listAdminSectionMedia } from "@/lib/data/admin/section-media";

export const dynamic = "force-dynamic";

interface EditSectionPageProps {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams: Promise<{ readonly created?: string }>;
}

export default async function EditSectionPage({ params, searchParams }: EditSectionPageProps) {
  await requireAdmin();

  const [{ id }, locale, { created }] = await Promise.all([params, getAdminLocale(), searchParams]);
  const [{ labels }, { labels: mediaLabels, uploadAvailable }, sectionResult, mediaResult] =
    await Promise.all([
      getSectionFormLabels(),
      getSectionMediaLabels(),
      getAdminSection(id),
      listAdminSectionMedia(id),
    ]);

  const t = await getTranslations({ locale, namespace: "adminSections" });

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
          {created === "1" ? (
            <p className="mb-8 rounded-control border border-success/45 bg-success/5 px-4 py-3 text-sm">
              {t("createdNotice")}
            </p>
          ) : null}

          {sectionResult.status === "success" ? (
            <div className="flex flex-col gap-16">
              <SectionForm
                action={updateSection}
                labels={labels}
                cancelHref="/admin/sections"
                section={sectionResult.data}
              />

              <hr className="border-border" />

              <SectionMediaManager
                sectionId={sectionResult.data.id}
                media={mediaResult.status === "success" ? mediaResult.data : []}
                labels={mediaLabels}
                uploadAvailable={uploadAvailable}
                uploadAction={uploadSectionMediaAction}
                deleteAction={deleteSectionMediaAction}
                moveAction={moveSectionMediaAction}
                toggleAction={toggleSectionMediaAction}
              />
            </div>
          ) : sectionResult.status === "empty" ? (
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
