import type { MenuItemStorageError } from "@/lib/storage/menu-item-image";
import type { MenuItemFieldErrors } from "@/lib/validation/menu-item";

/**
 * Error keys and form state for the menu-item actions.
 *
 * Separate from `actions.ts` because a `"use server"` module may only export async functions -
 * Next.js rejects a value export there, since every export becomes a callable server endpoint.
 * The constant below is a plain lookup table, so it lives here and the action file stays
 * exactly what the directive promises.
 *
 * Keys, not sentences: they are resolved to Arabic or English by the component that has a
 * translator, so one rule produces both languages without the actions knowing about locales.
 */

export const MENU_ITEM_ACTION_ERROR = {
  /** The menu item being edited or deleted no longer exists, or is unreadable. */
  itemNotFound: "itemNotFound",
  saveFailed: "saveFailed",
  deleteFailed: "deleteFailed",
  /**
   * The delete was refused by a foreign-key constraint.
   *
   * `menu_items` is currently a leaf: no table in the generated schema references it, so this
   * key is unreachable today. It is kept because the alternative - reporting a constraint
   * failure as a generic error - is exactly the wrong message if a future table starts
   * referencing menu items.
   */
  deleteInUse: "deleteInUse",
} as const;

export type MenuItemActionError =
  (typeof MENU_ITEM_ACTION_ERROR)[keyof typeof MENU_ITEM_ACTION_ERROR] | MenuItemStorageError;

/**
 * What the form renders after a submission.
 *
 * `invalid` carries per-field keys so each message lands beside its own input; `error` carries
 * a single key for a failure that is not attributable to one field - including the storage
 * outcomes, where the row saved but the photograph did not.
 */
export type MenuItemFormState =
  | { readonly status: "idle" }
  | { readonly status: "invalid"; readonly fields: MenuItemFieldErrors }
  | { readonly status: "error"; readonly error: MenuItemActionError };

export const MENU_ITEM_FORM_IDLE: MenuItemFormState = { status: "idle" };
