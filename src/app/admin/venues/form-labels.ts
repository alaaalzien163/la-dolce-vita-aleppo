import "server-only";

import { getTranslations } from "next-intl/server";

import type { VenueFormLabels } from "@/app/admin/venues/venue-form";
import { getAdminLocale } from "@/i18n/admin-locale";

/**
 * Assembles the localized strings the venue form needs.
 *
 * Shared by the create and edit routes so the two cannot end up describing the same field
 * differently. Every error key the schema and the actions can emit is mapped here in one
 * table - a key with no entry renders as `undefined`, so keeping the mapping in a single
 * place is what stops that happening silently.
 */
export async function getVenueFormLabels(): Promise<{ labels: VenueFormLabels }> {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "adminVenues" });

  return {
    labels: {
      name: t("fieldName"),
      section: t("fieldSection"),
      slug: t("fieldSlug"),
      description: t("fieldDescription"),
      displayOrder: t("fieldDisplayOrder"),
      isActive: t("fieldIsActive"),
      hintName: t("hintName"),
      hintSection: t("hintSection"),
      hintSlug: t("hintSlug"),
      hintDescription: t("hintDescription"),
      hintDisplayOrder: t("hintDisplayOrder"),
      selectSection: t("selectSection"),
      optional: t("optional"),
      save: t("save"),
      saving: t("saving"),
      cancel: t("cancel"),
      errors: {
        // Field validation, from `lib/validation/venue.ts`.
        nameRequired: t("nameRequired"),
        nameTooLong: t("nameTooLong"),
        slugRequired: t("slugRequired"),
        slugInvalid: t("slugInvalid"),
        slugTooLong: t("slugTooLong"),
        sectionRequired: t("sectionRequired"),
        sectionInvalid: t("sectionInvalid"),
        sectionNotFound: t("sectionNotFound"),
        descriptionTooLong: t("descriptionTooLong"),
        displayOrderInvalid: t("displayOrderInvalid"),
        displayOrderNegative: t("displayOrderNegative"),
        displayOrderTooLarge: t("displayOrderTooLarge"),
        // Action outcomes, from `app/admin/venues/actions.ts`.
        slugTaken: t("slugTaken"),
        venueNotFound: t("venueNotFound"),
        saveFailed: t("saveFailed"),
        deleteFailed: t("deleteFailed"),
        deleteInUse: t("deleteInUse"),
      },
    },
  };
}
