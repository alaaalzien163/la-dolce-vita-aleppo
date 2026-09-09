import { z } from "zod";

/**
 * Validation for `public.menu_items`, shared by the client hint and the server action.
 *
 * SERVER VALIDATION IS THE ONLY VALIDATION THAT COUNTS. A Server Action is a public HTTP
 * endpoint; anything reaching it can be crafted by hand, so `FormData` is parsed here before
 * it goes anywhere near the database. The browser's own `required`, `min`, and `step`
 * attributes remain useful for telling the admin what is wrong without a round trip, but
 * they are a convenience, not a gate.
 *
 * THIS TABLE HAS NO `slug` AND NO `is_active`. The generated schema gives `menu_items` two
 * independent booleans instead - `is_available` and `is_featured` - and no slug column at
 * all, so neither is validated here. Nothing is invented: every rule below corresponds to a
 * column that exists.
 *
 * Error messages are keys, not sentences. Resolving them happens in the component that has a
 * translator, which keeps the schema free of language and lets one rule produce Arabic or
 * English wording without duplicating the schema per locale.
 */

/** Limits are generous but finite: an unbounded text field is a denial-of-service field. */
const NAME_MAX_LENGTH = 160;
const DESCRIPTION_MAX_LENGTH = 2000;

/** Postgres `integer`. Beyond this the insert fails at the database, not here. */
const DISPLAY_ORDER_MAX = 2_147_483_647;

/**
 * Money, as a literal decimal string.
 *
 * Up to eight integer digits and at most two decimal places. The bound is deliberately
 * constrained to `numeric(10,2)`, so this is the largest accepted shape. Rejecting an oversized
 * price here produces a field-level message; letting it through would produce a database error
 * the admin cannot act on.
 *
 * The pattern also does the work of several separate rules. No sign is permitted, so `-5` and
 * `-0` are rejected; no exponent is permitted, so `1e3` is rejected; and because the test
 * runs on the string, `Number()` never gets the chance to quietly accept any of them.
 */
const PRICE_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;

export const MENU_ITEM_FIELD_ERROR = {
  nameRequired: "nameRequired",
  nameTooLong: "nameTooLong",
  categoryRequired: "categoryRequired",
  categoryInvalid: "categoryInvalid",
  /** Referenced by the action when no category with that id is visible to the admin. */
  categoryNotFound: "categoryNotFound",
  descriptionTooLong: "descriptionTooLong",
  priceInvalid: "priceInvalid",
  currencyInvalid: "currencyInvalid",
  /** A currency was submitted while no supported set is configured, so none can be trusted. */
  currencyNotConfigured: "currencyNotConfigured",
  displayOrderInvalid: "displayOrderInvalid",
  displayOrderNegative: "displayOrderNegative",
  displayOrderTooLarge: "displayOrderTooLarge",
} as const;

export type MenuItemFieldError = (typeof MENU_ITEM_FIELD_ERROR)[keyof typeof MENU_ITEM_FIELD_ERROR];

/**
 * A checkbox is absent from `FormData` when unchecked rather than present as `false`.
 * Treating a missing value as `false` is what makes unchecking actually persist.
 */
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null(), z.undefined()])
  .transform((value) => value === "on" || value === "true");

/**
 * Builds the schema for a given set of supported currencies.
 *
 * A factory rather than a constant because the permitted values are configuration, not a
 * fact this module can know. `menu_items.currency` is typed `string` with a database default,
 * and the generated types carry no CHECK constraint, so the set the database will actually
 * accept is not discoverable from the schema file.
 *
 * When the set is empty the field resolves to `null`, which the action reads as "omit the
 * column and let the database default apply". Writing a guessed currency code that a CHECK
 * constraint then rejects would fail every save; omitting it cannot.
 */
export function createMenuItemInputSchema(allowedCurrencies: readonly string[]) {
  return z.object({
    name: z
      .string()
      .transform((value) => value.trim())
      .refine((value) => value.length > 0, { message: MENU_ITEM_FIELD_ERROR.nameRequired })
      .refine((value) => value.length <= NAME_MAX_LENGTH, {
        message: MENU_ITEM_FIELD_ERROR.nameTooLong,
      }),

    /**
     * Required, a valid UUID, and - separately - must name an existing category. The empty
     * string fails the refine before `uuid()` ever parses it, so "nothing chosen" and
     * "chosen value is garbage" stay distinguishable. The database's
     * `menu_items_category_id_fkey` is the backstop that makes the chain safe against a
     * category disappearing mid-edit.
     */
    categoryId: z
      .string()
      .trim()
      .refine((value) => value.length > 0, { message: MENU_ITEM_FIELD_ERROR.categoryRequired })
      .pipe(z.uuid({ message: MENU_ITEM_FIELD_ERROR.categoryInvalid })),

    // Nullable in the database. An empty textarea is stored as NULL rather than `""`, so "no
    // description" has one representation instead of two.
    description: z
      .string()
      .transform((value) => {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      })
      .refine((value) => value === null || value.length <= DESCRIPTION_MAX_LENGTH, {
        message: MENU_ITEM_FIELD_ERROR.descriptionTooLong,
      }),

    /**
     * Empty input represents an intentionally unpriced item and is stored as NULL.
     *
     * The validated string is converted once, at the end, and no arithmetic is ever performed
     * on the result. That is what keeps binary floating point out of the money path: a value
     * with at most two decimals round-trips through `Number` to the identical shortest
     * decimal representation, so the exact text the admin typed is what Postgres parses into
     * `numeric`. Nothing here adds, multiplies, or rounds a price.
     */
    price: z
      .string()
      .transform((value) => value.trim())
      .refine((value) => value.length === 0 || PRICE_PATTERN.test(value), {
        message: MENU_ITEM_FIELD_ERROR.priceInvalid,
      })
      .transform((value) => (value.length === 0 ? null : Number(value)))
      .refine((value) => value === null || (Number.isFinite(value) && value >= 0), {
        message: MENU_ITEM_FIELD_ERROR.priceInvalid,
      }),

    currency: z
      .string()
      .transform((value) => value.trim())
      .transform((value) => (value.length > 0 ? value : null))
      .superRefine((value, ctx) => {
        if (value === null) {
          // Nothing submitted: the column is omitted and the database default applies.
          return;
        }

        if (allowedCurrencies.length === 0) {
          ctx.addIssue({
            code: "custom",
            message: MENU_ITEM_FIELD_ERROR.currencyNotConfigured,
          });
          return;
        }

        // Exact match, with no case folding. The configured list is the contract; normalising
        // it here could produce a value the database constraint does not recognise.
        if (!allowedCurrencies.includes(value)) {
          ctx.addIssue({ code: "custom", message: MENU_ITEM_FIELD_ERROR.currencyInvalid });
        }
      }),

    displayOrder: z
      .string()
      .transform((value) => value.trim())
      .refine((value) => /^\d+$/.test(value), {
        // A digits-only test rejects "1.5", "1e3", "-0", and internal spacing in one rule,
        // before `Number()` gets a chance to quietly accept any of them.
        message: MENU_ITEM_FIELD_ERROR.displayOrderInvalid,
      })
      .transform((value) => Number(value))
      .refine((value) => Number.isInteger(value) && value >= 0, {
        message: MENU_ITEM_FIELD_ERROR.displayOrderNegative,
      })
      .refine((value) => value <= DISPLAY_ORDER_MAX, {
        message: MENU_ITEM_FIELD_ERROR.displayOrderTooLarge,
      }),

    isAvailable: checkbox,
    isFeatured: checkbox,
  });
}

export type MenuItemInput = z.output<ReturnType<typeof createMenuItemInputSchema>>;

/** Field-keyed validation messages, in the shape the form renders. */
export type MenuItemFieldErrors = Partial<Record<keyof MenuItemInput, MenuItemFieldError>>;

/**
 * Parses `FormData` into a validated menu item, or into per-field error keys.
 *
 * Returns rather than throws: a validation failure is an expected outcome of a form
 * submission, not an exception, and the action needs to hand the errors back to be rendered
 * beside the offending fields.
 */
export function parseMenuItemForm(
  formData: FormData,
  allowedCurrencies: readonly string[],
): { ok: true; data: MenuItemInput } | { ok: false; errors: MenuItemFieldErrors } {
  const raw = {
    name: String(formData.get("name") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    description: String(formData.get("description") ?? ""),
    price: String(formData.get("price") ?? ""),
    currency: String(formData.get("currency") ?? ""),
    displayOrder: String(formData.get("displayOrder") ?? ""),
    isAvailable: formData.get("isAvailable") as "on" | null,
    isFeatured: formData.get("isFeatured") as "on" | null,
  };

  const result = createMenuItemInputSchema(allowedCurrencies).safeParse(raw);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  const errors: MenuItemFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) {
      errors[field as keyof MenuItemInput] = issue.message as MenuItemFieldError;
    }
  }

  return { ok: false, errors };
}
