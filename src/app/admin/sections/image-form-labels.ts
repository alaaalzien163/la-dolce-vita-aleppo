import "server-only";

import { getTranslations } from "next-intl/server";

import { isImageUploadAvailable } from "@/lib/storage/section-image";
import { getAdminLocale } from "@/i18n/admin-locale";
import type { SectionImagesLabels } from "@/app/admin/sections/section-images-manager";

export async function getSectionImagesLabels(): Promise<{
  labels: SectionImagesLabels;
  uploadAvailable: boolean;
}> {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "adminSectionImages" });

  return {
    uploadAvailable: isImageUploadAvailable(),
    labels: {
      title: t("title"),
      description: t("description"),
      uploadLabel: t("uploadLabel"),
      uploadHint: t("uploadHint"),
      removeFile: t("removeFile"),
      upload: t("upload"),
      uploading: t("uploading"),
      uploadSuccess: t("uploadSuccess"),
      uploadPartial: t("uploadPartial"),
      noImages: t("noImages"),
      existingHint: t("existingHint"),
      moveUp: t("moveUp"),
      moveDown: t("moveDown"),
      deleteImage: t("deleteImage"),
      confirmDelete: t("confirmDelete"),
      imageNumber: t("imageNumber"),
      uploadUnavailableTitle: t("uploadUnavailableTitle"),
      uploadUnavailableDescription: t("uploadUnavailableDescription"),
      errors: {
        storageNotConfigured: t("storageNotConfigured"),
        imageTooLarge: t("imageTooLarge"),
        imageUnsupportedType: t("imageUnsupportedType"),
        imageUploadFailed: t("imageUploadFailed"),
        deleteFailed: t("deleteFailed"),
        reorderFailed: t("reorderFailed"),
        insertFailed: t("insertFailed"),
        notFound: t("notFound"),
        noFiles: t("noFiles"),
      },
    },
  };
}
