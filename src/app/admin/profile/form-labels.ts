import "server-only";

import { getTranslations } from "next-intl/server";

import type { ProfileFormLabels } from "@/app/admin/profile/profile-form";
import type { PasswordFormLabels } from "@/app/admin/profile/password-form";
import { getAdminLocale } from "@/i18n/admin-locale";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation/profile";

/**
 * Assembles the localized strings the profile and password forms need.
 *
 * Every error key the schemas and the actions can emit is mapped here in one
 * table, exactly like the other admin modules - a key with no entry renders as
 * `undefined`, so a single mapping is what stops that happening silently.
 */
export async function getProfileFormLabels(): Promise<{
  profileLabels: ProfileFormLabels;
  passwordLabels: PasswordFormLabels;
}> {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "adminProfile" });

  return {
    profileLabels: {
      profileHeading: t("profileHeading"),
      fieldFullName: t("fieldFullName"),
      hintFullName: t("hintFullName"),
      fieldEmail: t("fieldEmail"),
      fieldRole: t("fieldRole"),
      optional: t("optional"),
      saveProfile: t("saveProfile"),
      savingProfile: t("savingProfile"),
      errors: {
        // Field validation, from `lib/validation/profile.ts`.
        fullNameTooLong: t("fullNameTooLong"),
        // Action outcomes, from `app/admin/profile/actions.ts`.
        profileUpdateFailed: t("profileUpdateFailed"),
        profileNotFound: t("profileNotFound"),
      },
    },
    passwordLabels: {
      changePasswordTitle: t("changePasswordTitle"),
      changePasswordDescription: t("changePasswordDescription"),
      fieldCurrentPassword: t("fieldCurrentPassword"),
      fieldNewPassword: t("fieldNewPassword"),
      fieldConfirmPassword: t("fieldConfirmPassword"),
      hintNewPassword: t("hintNewPassword", { count: MIN_PASSWORD_LENGTH }),
      savePassword: t("savePassword"),
      savingPassword: t("savingPassword"),
      errors: {
        // Field validation, from `lib/validation/profile.ts`.
        currentPasswordRequired: t("currentPasswordRequired"),
        newPasswordTooShort: t("newPasswordTooShort", { count: MIN_PASSWORD_LENGTH }),
        confirmationMismatch: t("confirmationMismatch"),
        newPasswordSameAsCurrent: t("newPasswordSameAsCurrent"),
        // Action outcomes, from `app/admin/profile/actions.ts`.
        emailNotAvailable: t("emailNotAvailable"),
        invalidCurrentPassword: t("invalidCurrentPassword"),
        passwordUpdateFailed: t("passwordUpdateFailed"),
      },
    },
  };
}
