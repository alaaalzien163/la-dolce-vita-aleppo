import type { SectionFieldErrors } from "@/lib/validation/section";
import type { StorageError } from "@/lib/storage/section-image";

/**
 * Error keys and form state for the section actions.
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

export const SECTION_ACTION_ERROR = {
  /** The database's unique constraint on `slug` rejected the value. */
  slugTaken: "slugTaken",
  notFound: "sectionNotFound",
  saveFailed: "saveFailed",
  deleteFailed: "deleteFailed",
} as const;

export type SectionActionError =
  (typeof SECTION_ACTION_ERROR)[keyof typeof SECTION_ACTION_ERROR] | StorageError;

/**
 * What the form renders after a submission.
 *
 * `invalid` carries per-field keys so each message lands beside its own input; `error`
 * carries a single key for a failure that is not attributable to one field.
 */
export type SectionFormState =
  | { readonly status: "idle" }
  | { readonly status: "invalid"; readonly fields: SectionFieldErrors }
  | { readonly status: "error"; readonly error: SectionActionError };

export const SECTION_FORM_IDLE: SectionFormState = { status: "idle" };
