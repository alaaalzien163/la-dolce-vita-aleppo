import "server-only";

import { getTranslations } from "next-intl/server";

import { getAdminLocale } from "@/i18n/admin-locale";
import type { SiteSettingsFormLabels } from "@/app/admin/settings/settings-form";

/**
 * Assembles the localized strings the settings form needs.
 *
 * Every error key the schema and the action can emit is mapped here in one
 * table, exactly like the other admin forms - a key with no entry renders as
 * `undefined`, so keeping the mapping in a single place is what stops that
 * happening silently.
 */
export async function getSiteSettingsFormLabels(): Promise<{ labels: SiteSettingsFormLabels }> {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "adminSiteSettings" });

  return {
    labels: {
      siteName: t("fieldSiteName"),
      tagline: t("fieldTagline"),
      phone: t("fieldPhone"),
      email: t("fieldEmail"),
      address: t("fieldAddress"),
      googleMapsUrl: t("fieldGoogleMapsUrl"),
      instagramUrl: t("fieldInstagramUrl"),
      hintSiteName: t("hintSiteName"),
      hintTagline: t("hintTagline"),
      hintPhone: t("hintPhone"),
      hintEmail: t("hintEmail"),
      hintAddress: t("hintAddress"),
      hintGoogleMapsUrl: t("hintGoogleMapsUrl"),
      hintInstagramUrl: t("hintInstagramUrl"),
      legendIdentity: t("legendIdentity"),
      legendContact: t("legendContact"),
      optional: t("optional"),
      save: t("save"),
      saving: t("saving"),
      errors: {
        // Field validation, from `lib/validation/site-settings.ts`.
        siteNameRequired: t("siteNameRequired"),
        siteNameTooLong: t("siteNameTooLong"),
        taglineTooLong: t("taglineTooLong"),
        phoneTooLong: t("phoneTooLong"),
        emailInvalid: t("emailInvalid"),
        emailTooLong: t("emailTooLong"),
        addressTooLong: t("addressTooLong"),
        googleMapsUrlInvalid: t("googleMapsUrlInvalid"),
        googleMapsUrlTooLong: t("googleMapsUrlTooLong"),
        instagramUrlInvalid: t("instagramUrlInvalid"),
        instagramUrlTooLong: t("instagramUrlTooLong"),
        // Action outcomes, from `app/admin/settings/actions.ts`.
        saveFailed: t("saveFailed"),
        singletonMalformed: t("singletonMalformed"),
      },
    },
  };
}
