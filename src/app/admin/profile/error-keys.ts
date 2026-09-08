import type { ProfileFormValues, PasswordFormValues } from "@/lib/validation/profile";

/**
 * Action-level outcomes for `updateAdminProfile` and `changeAdminPassword`.
 *
 * Field validation errors are separate keys, defined in `lib/validation/profile.ts`.
 * Every key here resolves in the `adminProfile` namespace's errors map.
 */
export const PROFILE_ACTION_ERROR = {
  profileUpdateFailed: "profileUpdateFailed",
  profileNotFound: "profileNotFound",
} as const;

export type ProfileActionError = (typeof PROFILE_ACTION_ERROR)[keyof typeof PROFILE_ACTION_ERROR];

export const PASSWORD_ACTION_ERROR = {
  emailNotAvailable: "emailNotAvailable",
  invalidCurrentPassword: "invalidCurrentPassword",
  passwordUpdateFailed: "passwordUpdateFailed",
} as const;

export type PasswordActionError =
  (typeof PASSWORD_ACTION_ERROR)[keyof typeof PASSWORD_ACTION_ERROR];

export interface ProfileFormState {
  readonly status: "idle" | "invalid" | "error";
  readonly fields?: ProfileFormValues;
  readonly error?: ProfileActionError;
}

export interface PasswordFormState {
  readonly status: "idle" | "invalid" | "error";
  readonly fields?: PasswordFormValues;
  readonly error?: PasswordActionError;
}

export const PROFILE_FORM_IDLE: ProfileFormState = { status: "idle" };
export const PASSWORD_FORM_IDLE: PasswordFormState = { status: "idle" };
