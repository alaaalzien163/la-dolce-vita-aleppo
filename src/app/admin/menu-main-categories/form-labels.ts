import "server-only";

import { getTranslations } from "next-intl/server";

import type { MenuMainCategoryFormLabels } from "@/app/admin/menu-main-categories/main-category-form";
import { getAdminLocale } from "@/i18n/admin-locale";

/**
 * Assembles the localized strings the main-category form needs.
 *
 * Shared by the create and edit routes so the two cannot end up describing the same field
 * differently. Every error key the schema and the actions can emit is mapped here in one
 * table - a key with no entry renders as `undefined`, so keeping the mapping in a single
 * place is what stops that happening silently.
 */
export async function getMenuMainCategoryFormLabels(): Promise<{
  labels: MenuMainCategoryFormLabels;
}> {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "adminMenuMainCategories" });

  return {
    labels: {
      name: t("fieldName"),
      menu: t("fieldMenu"),
      slug: t("fieldSlug"),
      description: t("fieldDescription"),
      displayOrder: t("fieldDisplayOrder"),
      isActive: t("fieldIsActive"),
      hintName: t("hintName"),
      hintMenu: t("hintMenu"),
      hintSlug: t("hintSlug"),
      hintDescription: t("hintDescription"),
      hintDisplayOrder: t("hintDisplayOrder"),
      selectMenu: t("selectMenu"),
      optional: t("optional"),
      save: t("save"),
      saving: t("saving"),
      cancel: t("cancel"),
      errors: {
        // Field validation, from `lib/validation/menu-main-category.ts`.
        nameRequired: t("nameRequired"),
        nameTooLong: t("nameTooLong"),
        slugRequired: t("slugRequired"),
        slugInvalid: t("slugInvalid"),
        slugTooLong: t("slugTooLong"),
        menuRequired: t("menuRequired"),
        menuInvalid: t("menuInvalid"),
        menuNotFound: t("menuNotFound"),
        descriptionTooLong: t("descriptionTooLong"),
        displayOrderInvalid: t("displayOrderInvalid"),
        displayOrderNegative: t("displayOrderNegative"),
        displayOrderTooLarge: t("displayOrderTooLarge"),
        // Action outcomes, from `app/admin/menu-main-categories/actions.ts`.
        slugTaken: t("slugTaken"),
        mainCategoryNotFound: t("mainCategoryNotFound"),
        saveFailed: t("saveFailed"),
        deleteFailed: t("deleteFailed"),
        deleteInUse: t("deleteInUse"),
      },
    },
  };
}
