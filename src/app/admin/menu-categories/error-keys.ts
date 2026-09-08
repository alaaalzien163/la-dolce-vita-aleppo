import type { MenuCategoryFieldErrors } from "@/lib/validation/menu-category";

/**
 * Error keys and form state for the category actions.
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

export const MENU_CATEGORY_ACTION_ERROR = {
  /** The database's unique constraint on `slug` rejected the value. */
  slugTaken: "slugTaken",
  /** The category being edited or deleted no longer exists, or is unreadable. */
  categoryNotFound: "categoryNotFound",
  saveFailed: "saveFailed",
  deleteFailed: "deleteFailed",
  /**
   * The delete was refused by a foreign-key constraint: `menu_items` still reference this
   * category, so it cannot be removed until those items are dealt with.
   */
  deleteInUse: "deleteInUse",
} as const;

export type MenuCategoryActionError =
  (typeof MENU_CATEGORY_ACTION_ERROR)[keyof typeof MENU_CATEGORY_ACTION_ERROR];

/**
 * What the form renders after a submission.
 *
 * `invalid` carries per-field keys so each message lands beside its own input; `error`
 * carries a single key for a failure that is not attributable to one field.
 */
export type MenuCategoryFormState =
  | { readonly status: "idle" }
  | { readonly status: "invalid"; readonly fields: MenuCategoryFieldErrors }
  | { readonly status: "error"; readonly error: MenuCategoryActionError };

export const MENU_CATEGORY_FORM_IDLE: MenuCategoryFormState = { status: "idle" };
