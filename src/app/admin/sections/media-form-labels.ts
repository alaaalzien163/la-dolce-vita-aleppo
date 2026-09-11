import "server-only";

import { getTranslations } from "next-intl/server";

import type { SectionMediaLabels } from "@/app/admin/sections/section-media-manager";
import { getAdminLocale } from "@/i18n/admin-locale";
import { isImageUploadAvailable } from "@/lib/storage/section-image";

export async function getSectionMediaLabels(): Promise<{
  labels: SectionMediaLabels;
  uploadAvailable: boolean;
}> {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "adminSectionMedia" });

  return {
    uploadAvailable: isImageUploadAvailable(),
    labels: {
      title: t("title"),
      description: t("description"),
      uploadLabel: t("uploadLabel"),
      uploadHint: t("uploadHint"),
      videoLabel: t("videoLabel"),
      videoHint: t("videoHint"),
      posterLabel: t("posterLabel"),
      posterHint: t("posterHint"),
      addVideos: t("addVideos"),
      removeFile: t("removeFile"),
      upload: t("upload"),
      uploading: t("uploading"),
      uploadSuccess: t("uploadSuccess"),
      uploadPartial: t("uploadPartial"),
      noMedia: t("noMedia"),
      existingHint: t("existingHint"),
      mediaNumber: t("mediaNumber"),
      mediaTypeImage: t("mediaTypeImage"),
      mediaTypeVideo: t("mediaTypeVideo"),
      activateMedia: t("activateMedia"),
      deactivateMedia: t("deactivateMedia"),
      moveUp: t("moveUp"),
      moveDown: t("moveDown"),
      deleteMedia: t("deleteMedia"),
      confirmDelete: t("confirmDelete"),
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
        noVideos: t("noVideos"),
        videoPathInvalid: t("videoPathInvalid"),
      },
    },
  };
}