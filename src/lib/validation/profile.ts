import { z } from "zod";

/**
 * Validation for the admin's own `public.profiles` row and the password change.
 *
 * SERVER VALIDATION IS THE ONLY VALIDATION THAT COUNTS. `maxLength`,
 * `autoComplete`, and `type="password"` on the client are hints for the human
 * using the form; the browser's own checks are another opinion, and an attacker
 * does not use a browser. The schema below is the authority.
 *
 * `public.profiles` carries NO email column (verified against the live schema).
 * Email lives in Supabase Auth, so this module only ever displays it from the
 * verified token claims and never writes it.
 *
 * ONLY THE ADMIN'S OWN ROW IS TOUCHED. The actions derive `auth.uid()` from the
 * session (via `requireAdmin()`); no profile id ever comes from the form, and
 * `role` is not a field in any payload below, so a form submission cannot
 * elevate or demote anyone.
 *
 * PASSWORDS ARE NEVER STORED, LOGGED, OR RETURNED. The current password is
 * verified by an actual `signInWithPassword` call - the supported Auth API - and
 * the new password is applied with `updateUser`, both against Supabase Auth.
 * Nothing here touches `auth.users` through SQL, and no validation below echoes
 * a password back to the browser.
 */

/** App-level cap on `full_name`. The column is `text`; this limits a DoS field. */
const FULL_NAME_MAX_LENGTH = 120;
/** Sensible minimum password length; Supabase allows projects to override it lower. */
export const MIN_PASSWORD_LENGTH = 8;

export const PROFILE_FIELD_ERROR = {
  fullNameTooLong: "fullNameTooLong",
} as const;

export type ProfileFieldError = (typeof PROFILE_FIELD_ERROR)[keyof typeof PROFILE_FIELD_ERROR];

export const PASSWORD_FIELD_ERROR = {
  currentPasswordRequired: "currentPasswordRequired",
  newPasswordTooShort: "newPasswordTooShort",
  confirmationMismatch: "confirmationMismatch",
  newPasswordSameAsCurrent: "newPasswordSameAsCurrent",
} as const;

export type PasswordFieldError = (typeof PASSWORD_FIELD_ERROR)[keyof typeof PASSWORD_FIELD_ERROR];

/** Optional text that becomes `NULL` when blank, so "no value" has one shape. */
function optionalText(maxLength: number, tooLong: ProfileFieldError) {
  return z
    .string()
    .transform((value) => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .refine((value) => value === null || value.length <= maxLength, { message: tooLong });
}

const profileInputSchema = z.object({
  fullName: optionalText(FULL_NAME_MAX_LENGTH, PROFILE_FIELD_ERROR.fullNameTooLong),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;

export type ProfileFormValues = {
  fullName?: ProfileFieldError;
};

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, { message: PASSWORD_FIELD_ERROR.currentPasswordRequired }),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, { message: PASSWORD_FIELD_ERROR.newPasswordTooShort }),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: PASSWORD_FIELD_ERROR.newPasswordSameAsCurrent,
    path: ["newPassword"],
  })
  .refine((value) => value.confirmPassword === value.newPassword, {
    message: PASSWORD_FIELD_ERROR.confirmationMismatch,
    path: ["confirmPassword"],
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export type PasswordFormValues = {
  currentPassword?: PasswordFieldError;
  newPassword?: PasswordFieldError;
  confirmPassword?: PasswordFieldError;
};

/**
 * Parses the raw profile form. Non-string values are dropped to the empty
 * candidate and rejected by the schema, since a caller can submit anything.
 */
export function parseAdminProfileForm(
  formData: FormData,
):
  | { readonly ok: true; readonly values: ProfileInput }
  | { readonly ok: false; readonly fieldErrors: ProfileFormValues } {
  const candidate = {
    fullName: String(formData.get("fullName") ?? ""),
  };

  const parsed = profileInputSchema.safeParse(candidate);

  if (parsed.success) {
    return { ok: true, values: parsed.data };
  }

  const fieldErrors: ProfileFormValues = {};

  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && field in fieldErrors === false) {
      fieldErrors[field as keyof ProfileFormValues] = issue.message as ProfileFieldError;
    }
  }

  return { ok: false, fieldErrors };
}

/**
 * Parses the password form. The same field-error map is used for the two empty
 * branches, so an absent confirmation reads as `currentPasswordRequired` only if
 * it is the sole problem; the schema's own refinements decide the rest. The raw
 * values never leave this module as messages - only stable keys do.
 */
export function parsePasswordChangeForm(
  formData: FormData,
):
  | { readonly ok: true; readonly values: PasswordChangeInput }
  | { readonly ok: false; readonly fieldErrors: PasswordFormValues } {
  const candidate = {
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  const parsed = passwordChangeSchema.safeParse(candidate);

  if (parsed.success) {
    return { ok: true, values: parsed.data };
  }

  const fieldErrors: PasswordFormValues = {};

  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && field in fieldErrors === false) {
      fieldErrors[field as keyof PasswordFormValues] = issue.message as PasswordFieldError;
    }
  }

  return { ok: false, fieldErrors };
}
