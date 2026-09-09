import "server-only";

import { getTranslations } from "next-intl/server";

import type { MenuItemFormLabels } from "@/app/admin/menu-items/item-form";
import { getAdminLocale } from "@/i18n/admin-locale";
import { getSupportedMenuItemCurrencies } from "@/lib/constants/menu-item-currency";
import type { MenuItemCategoryGroup } from "@/lib/data/admin/menu-items";
import { isMenuItemImageUploadAvailable } from "@/lib/storage/menu-item-image";

/**
 * Assembles the localized strings the menu-item form needs.
 *
 * Shared by the create and edit routes so the two cannot end up describing the same field
 * differently. Every error key the schema, the actions, and the storage helpers can emit is
 * mapped here in one table - a key with no entry renders as `undefined`, so keeping the mapping
 * in a single place is what stops that happening silently.
 *
 * The category group labels are composed here too. They need three names and therefore a
 * separator, and the separator belongs in the message catalogue rather than in the component:
 * a hardcoded arrow would be a Latin-directional glyph baked into code and impossible to adjust
 * per locale. `groupLabel` takes `{menu}` and `{mainCategory}` and each catalogue decides how
 * to join them.
 */
export async function getMenuItemFormLabels(groups: readonly MenuItemCategoryGroup[]): Promise<{
  labels: MenuItemFormLabels;
}> {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "adminMenuItems" });

  return {
    labels: {
      name: t("fieldName"),
      category: t("fieldCategory"),
      description: t("fieldDescription"),
      price: t("fieldPrice"),
      currency: t("fieldCurrency"),
      image: t("fieldImage"),
      displayOrder: t("fieldDisplayOrder"),
      isAvailable: t("fieldIsAvailable"),
      isFeatured: t("fieldIsFeatured"),
      hintName: t("hintName"),
      hintCategory: t("hintCategory"),
      hintDescription: t("hintDescription"),
      hintPrice: t("hintPrice"),
      hintCurrency: t("hintCurrency"),
      hintImage: t("hintImage"),
      hintDisplayOrder: t("hintDisplayOrder"),
      selectCategory: t("selectCategory"),
      optional: t("optional"),
      currentImage: t("currentImage"),
      removeImage: t("removeImage"),
      replaceImageHint: t("replaceImageHint"),
      save: t("save"),
      saving: t("saving"),
      cancel: t("cancel"),
      uploadUnavailableTitle: t("uploadUnavailableTitle"),
      uploadUnavailableDescription: t("uploadUnavailableDescription"),
      uploadAvailable: isMenuItemImageUploadAvailable(),
      currencies: getSupportedMenuItemCurrencies(),
      // One pre-composed label per group, so the client component never needs a translator.
      groupLabels: groups.map((group) =>
        t("groupLabel", {
          menu: group.menuName ?? t("unknownMenu"),
          mainCategory: group.mainCategoryName ?? t("unknownMainCategory"),
        }),
      ),
      errors: {
        // Field validation, from `lib/validation/menu-item.ts`.
        nameRequired: t("nameRequired"),
        nameTooLong: t("nameTooLong"),
        categoryRequired: t("categoryRequired"),
        categoryInvalid: t("categoryInvalid"),
        categoryNotFound: t("categoryNotFound"),
        descriptionTooLong: t("descriptionTooLong"),
        priceInvalid: t("priceInvalid"),
        currencyInvalid: t("currencyInvalid"),
        currencyNotConfigured: t("currencyNotConfigured"),
        displayOrderInvalid: t("displayOrderInvalid"),
        displayOrderNegative: t("displayOrderNegative"),
        displayOrderTooLarge: t("displayOrderTooLarge"),
        // Action outcomes, from `app/admin/menu-items/actions.ts`.
        itemNotFound: t("itemNotFound"),
        saveFailed: t("saveFailed"),
        deleteFailed: t("deleteFailed"),
        deleteInUse: t("deleteInUse"),
        // Storage outcomes, from `lib/storage/menu-item-image.ts`.
        storageNotConfigured: t("storageNotConfigured"),
        imageTooLarge: t("imageTooLarge"),
        imageUnsupportedType: t("imageUnsupportedType"),
        imageUploadFailed: t("imageUploadFailed"),
      },
    },
  };
}
