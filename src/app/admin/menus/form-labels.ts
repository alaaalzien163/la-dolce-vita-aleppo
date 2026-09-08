import "server-only";

import { getTranslations } from "next-intl/server";

import type { MenuFormLabels } from "@/app/admin/menus/menu-form";
import { getAdminLocale } from "@/i18n/admin-locale";

/**
 * Assembles the localized strings the menu form needs.
 *
 * Shared by the create and edit routes so the two cannot end up describing the same field
 * differently. Every error key the schema and the actions can emit is mapped here in one
 * table - a key with no entry renders as `undefined`, so keeping the mapping in a single
 * place is what stops that happening silently.
 */
export async function getMenuFormLabels(): Promise<{ labels: MenuFormLabels }> {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "adminMenus" });

  return {
    labels: {
      name: t("fieldName"),
      venue: t("fieldVenue"),
      slug: t("fieldSlug"),
      description: t("fieldDescription"),
      displayOrder: t("fieldDisplayOrder"),
      isActive: t("fieldIsActive"),
      hintName: t("hintName"),
      hintVenue: t("hintVenue"),
      hintSlug: t("hintSlug"),
      hintDescription: t("hintDescription"),
      hintDisplayOrder: t("hintDisplayOrder"),
      selectVenue: t("selectVenue"),
      optional: t("optional"),
      save: t("save"),
      saving: t("saving"),
      cancel: t("cancel"),
      errors: {
        // Field validation, from `lib/validation/menu.ts`.
        nameRequired: t("nameRequired"),
        nameTooLong: t("nameTooLong"),
        slugRequired: t("slugRequired"),
        slugInvalid: t("slugInvalid"),
        slugTooLong: t("slugTooLong"),
        venueRequired: t("venueRequired"),
        venueInvalid: t("venueInvalid"),
        venueNotFound: t("venueNotFound"),
        descriptionTooLong: t("descriptionTooLong"),
        displayOrderInvalid: t("displayOrderInvalid"),
        displayOrderNegative: t("displayOrderNegative"),
        displayOrderTooLarge: t("displayOrderTooLarge"),
        // Action outcomes, from `app/admin/menus/actions.ts`.
        slugTaken: t("slugTaken"),
        menuNotFound: t("menuNotFound"),
        saveFailed: t("saveFailed"),
        deleteFailed: t("deleteFailed"),
        deleteInUse: t("deleteInUse"),
      },
    },
  };
}
