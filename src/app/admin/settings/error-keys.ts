import type { SiteSettingsFormValues } from "@/lib/validation/site-settings";

/**
 * Outcomes of `saveSiteSettings` that are not tied to a single field.
 *
 * The client form resolves these against the `adminSiteSettings` namespace, like
 * it does for field errors.
 */
export const SITE_SETTINGS_ACTION_ERROR = {
  saveFailed: "saveFailed",
  singletonMalformed: "singletonMalformed",
} as const;

export type SiteSettingsActionError =
  (typeof SITE_SETTINGS_ACTION_ERROR)[keyof typeof SITE_SETTINGS_ACTION_ERROR];

export interface SiteSettingsFormState {
  readonly status: "idle" | "invalid" | "error";
  /** Present when `status` is `"invalid"`: one entry per field that failed. */
  readonly fields?: SiteSettingsFormValues;
  /** Present when `status` is `"error"`. */
  readonly error?: SiteSettingsActionError;
}

/** Initial state for `useActionState`, before any submit has happened. */
export const SITE_SETTINGS_FORM_IDLE: SiteSettingsFormState = { status: "idle" };
