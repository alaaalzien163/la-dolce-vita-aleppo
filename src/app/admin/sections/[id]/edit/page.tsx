import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { updateSection } from "@/app/admin/sections/actions";
import {
  deleteSectionImageAction,
  moveSectionImageAction,
  uploadSectionImagesAction,
} from "@/app/admin/sections/image-actions";
import { getSectionImagesLabels } from "@/app/admin/sections/image-form-labels";
import { getSectionFormLabels } from "@/app/admin/sections/form-labels";
import { SectionForm } from "@/app/admin/sections/section-form";
import { SectionImagesManager } from "@/app/admin/sections/section-images-manager";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminSection } from "@/lib/data/admin/sections";
import { listAdminSectionImages } from "@/lib/data/admin/section-images";

export const dynamic = "force-dynamic";

interface EditSectionPageProps {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams: Promise<{ readonly created?: string }>;
}

export default async function EditSectionPage({ params, searchParams }: EditSectionPageProps) {
  await requireAdmin();

  const [{ id }, locale, { created }] = await Promise.all([params, getAdminLocale(), searchParams]);
  const [{ labels }, { labels: imageLabels, uploadAvailable }, sectionResult, imagesResult] =
    await Promise.all([
      getSectionFormLabels(),
      getSectionImagesLabels(),
      getAdminSection(id),
      listAdminSectionImages(id),
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

              <SectionImagesManager
                sectionId={sectionResult.data.id}
                images={imagesResult.status === "success" ? imagesResult.data : []}
                labels={imageLabels}
                uploadAvailable={uploadAvailable}
                uploadAction={uploadSectionImagesAction}
                deleteAction={deleteSectionImageAction}
                moveAction={moveSectionImageAction}
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
