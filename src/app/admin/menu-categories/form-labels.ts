import "server-only";

import { getTranslations } from "next-intl/server";

import type { MenuCategoryFormLabels } from "@/app/admin/menu-categories/category-form";
import { getAdminLocale } from "@/i18n/admin-locale";

/**
 * Assembles the localized strings the category form needs.
 *
 * Shared by the create and edit routes so the two cannot end up describing the same field
 * differently. Every error key the schema and the actions can emit is mapped here in one
 * table - a key with no entry renders as `undefined`, so keeping the mapping in a single
 * place is what stops that happening silently.
 */
export async function getMenuCategoryFormLabels(): Promise<{ labels: MenuCategoryFormLabels }> {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "adminMenuCategories" });

  return {
    labels: {
      name: t("fieldName"),
      mainCategory: t("fieldMainCategory"),
      slug: t("fieldSlug"),
      description: t("fieldDescription"),
      displayOrder: t("fieldDisplayOrder"),
      isActive: t("fieldIsActive"),
      hintName: t("hintName"),
      hintMainCategory: t("hintMainCategory"),
      hintSlug: t("hintSlug"),
      hintDescription: t("hintDescription"),
      hintDisplayOrder: t("hintDisplayOrder"),
      selectMainCategory: t("selectMainCategory"),
      unknownMenu: t("unknownMenu"),
      optional: t("optional"),
      save: t("save"),
      saving: t("saving"),
      cancel: t("cancel"),
      errors: {
        // Field validation, from `lib/validation/menu-category.ts`.
        nameRequired: t("nameRequired"),
        nameTooLong: t("nameTooLong"),
        slugRequired: t("slugRequired"),
        slugInvalid: t("slugInvalid"),
        slugTooLong: t("slugTooLong"),
        mainCategoryRequired: t("mainCategoryRequired"),
        mainCategoryInvalid: t("mainCategoryInvalid"),
        mainCategoryNotFound: t("mainCategoryNotFound"),
        descriptionTooLong: t("descriptionTooLong"),
        displayOrderInvalid: t("displayOrderInvalid"),
        displayOrderNegative: t("displayOrderNegative"),
        displayOrderTooLarge: t("displayOrderTooLarge"),
        // Action outcomes, from `app/admin/menu-categories/actions.ts`.
        slugTaken: t("slugTaken"),
        categoryNotFound: t("categoryNotFound"),
        saveFailed: t("saveFailed"),
        deleteFailed: t("deleteFailed"),
        deleteInUse: t("deleteInUse"),
      },
    },
  };
}
