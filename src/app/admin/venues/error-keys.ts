import type { VenueFieldErrors } from "@/lib/validation/venue";

/**
 * Error keys and form state for the venue actions.
 *
 * Separate from `actions.ts` because a `"use server"` module may only export async
 * functions - Next.js rejects a value export there, since every export becomes a callable
 * server endpoint. The constant below is a plain lookup table, so it lives here and the
 * action file stays exactly what the directive promises.
 *
 * Keys, not sentences: they are resolved to Arabic or English by the component that has a
 * translator, so one rule produces both languages without the actions knowing about
 * locales.
 */

export const VENUE_ACTION_ERROR = {
  /** The database's unique constraint on `slug` rejected the value. */
  slugTaken: "slugTaken",
  /** The venue being edited or deleted no longer exists, or is unreadable. */
  venueNotFound: "venueNotFound",
  saveFailed: "saveFailed",
  deleteFailed: "deleteFailed",
  /**
   * The delete was refused by a foreign-key constraint: other rows still reference this
   * venue (e.g. menus), so it cannot be removed until they are dealt with.
   */
  deleteInUse: "deleteInUse",
} as const;

export type VenueActionError = (typeof VENUE_ACTION_ERROR)[keyof typeof VENUE_ACTION_ERROR];

/**
 * What the form renders after a submission.
 *
 * `invalid` carries per-field keys so each message lands beside its own input; `error`
 * carries a single key for a failure that is not attributable to one field.
 */
export type VenueFormState =
  | { readonly status: "idle" }
  | { readonly status: "invalid"; readonly fields: VenueFieldErrors }
  | { readonly status: "error"; readonly error: VenueActionError };

export const VENUE_FORM_IDLE: VenueFormState = { status: "idle" };
