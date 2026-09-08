import "server-only";

import { getTranslations } from "next-intl/server";

import type { SectionFormLabels } from "@/app/admin/sections/section-form";
import { getAdminLocale } from "@/i18n/admin-locale";
import { isImageUploadAvailable } from "@/lib/storage/section-image";

/**
 * Assembles the localized strings the section form needs.
 *
 * Shared by the create and edit routes so the two cannot end up describing the same field
 * differently. Every error key the schema, the actions, and the storage helpers can emit is
 * mapped here in one table - a key with no entry renders as `undefined`, so keeping the
 * mapping in a single place is what stops that happening silently.
 */
export async function getSectionFormLabels(): Promise<{
  labels: SectionFormLabels;
  uploadAvailable: boolean;
}> {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "adminSections" });

  return {
    uploadAvailable: isImageUploadAvailable(),
    labels: {
      name: t("fieldName"),
      slug: t("fieldSlug"),
      description: t("fieldDescription"),
      image: t("fieldImage"),
      displayOrder: t("fieldDisplayOrder"),
      isActive: t("fieldIsActive"),
      hintName: t("hintName"),
      hintSlug: t("hintSlug"),
      hintDescription: t("hintDescription"),
      hintDisplayOrder: t("hintDisplayOrder"),
      hintImage: t("hintImage"),
      optional: t("optional"),
      currentImage: t("currentImage"),
      removeImage: t("removeImage"),
      replaceImageHint: t("replaceImageHint"),
      save: t("save"),
      saving: t("saving"),
      cancel: t("cancel"),
      uploadUnavailableTitle: t("uploadUnavailableTitle"),
      uploadUnavailableDescription: t("uploadUnavailableDescription"),
      errors: {
        // Field validation, from `lib/validation/section.ts`.
        nameRequired: t("nameRequired"),
        nameTooLong: t("nameTooLong"),
        slugRequired: t("slugRequired"),
        slugInvalid: t("slugInvalid"),
        slugTooLong: t("slugTooLong"),
        descriptionTooLong: t("descriptionTooLong"),
        displayOrderInvalid: t("displayOrderInvalid"),
        displayOrderNegative: t("displayOrderNegative"),
        displayOrderTooLarge: t("displayOrderTooLarge"),
        // Action outcomes, from `app/admin/sections/actions.ts`.
        slugTaken: t("slugTaken"),
        sectionNotFound: t("sectionNotFound"),
        saveFailed: t("saveFailed"),
        deleteFailed: t("deleteFailed"),
        // Storage outcomes, from `lib/storage/section-image.ts`.
        storageNotConfigured: t("storageNotConfigured"),
        imageTooLarge: t("imageTooLarge"),
        imageUnsupportedType: t("imageUnsupportedType"),
        imageUploadFailed: t("imageUploadFailed"),
      },
    },
  };
}
