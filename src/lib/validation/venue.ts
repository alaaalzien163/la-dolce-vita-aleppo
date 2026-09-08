import { z } from "zod";

import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "@/lib/utils/slug";

/**
 * Validation for `public.venues`, shared by the client hint and the server action.
 *
 * SERVER VALIDATION IS THE ONLY VALIDATION THAT COUNTS. A Server Action is a public HTTP
 * endpoint; anything reaching it can be crafted by hand, so `FormData` is parsed here
 * before it goes anywhere near the database. The browser's own `required`, `pattern`, and
 * `min` attributes remain useful for telling the admin what is wrong without a round
 * trip, but they are a convenience, not a gate.
 *
 * `section_id` is checked for two things: that it is a syntactically valid UUID, and that
 * it names a section that actually exists. The second check cannot live here - existence
 * is a database fact - so the schema enforces the shape and the server action verifies
 * the reference (the foreign-key constraint is the final authority either way).
 *
 * Error messages are keys, not sentences. Resolving them happens in the component that
 * has a translator, which keeps the schema free of language and lets one rule produce
 * Arabic or English wording without duplicating the schema per locale.
 */

/** Limits are generous but finite: an unbounded text field is a denial-of-service field. */
const NAME_MAX_LENGTH = 160;
const DESCRIPTION_MAX_LENGTH = 2000;

/** Postgres `integer`. Beyond this the insert fails at the database, not here. */
const DISPLAY_ORDER_MAX = 2_147_483_647;

export const VENUE_FIELD_ERROR = {
  nameRequired: "nameRequired",
  nameTooLong: "nameTooLong",
  slugRequired: "slugRequired",
  slugInvalid: "slugInvalid",
  slugTooLong: "slugTooLong",
  sectionRequired: "sectionRequired",
  sectionInvalid: "sectionInvalid",
  /** Referenced by the action when no section with that id is visible to the admin. */
  sectionNotFound: "sectionNotFound",
  descriptionTooLong: "descriptionTooLong",
  displayOrderInvalid: "displayOrderInvalid",
  displayOrderNegative: "displayOrderNegative",
  displayOrderTooLarge: "displayOrderTooLarge",
} as const;

export type VenueFieldError = (typeof VENUE_FIELD_ERROR)[keyof typeof VENUE_FIELD_ERROR];

/**
 * `is_active` arrives from a checkbox, which is absent from `FormData` when unchecked
 * rather than present as `false`. Treating a missing value as `false` is what makes
 * unchecking actually persist.
 */
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null(), z.undefined()])
  .transform((value) => value === "on" || value === "true");

export const venueInputSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, { message: VENUE_FIELD_ERROR.nameRequired })
    .refine((value) => value.length <= NAME_MAX_LENGTH, {
      message: VENUE_FIELD_ERROR.nameTooLong,
    }),

  slug: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .refine((value) => value.length > 0, { message: VENUE_FIELD_ERROR.slugRequired })
    .refine((value) => value.length <= SLUG_MAX_LENGTH, {
      message: VENUE_FIELD_ERROR.slugTooLong,
    })
    .refine((value) => SLUG_PATTERN.test(value), {
      message: VENUE_FIELD_ERROR.slugInvalid,
    }),

  /**
   * Required, a valid UUID, and - separately - must name an existing section. The empty
   * string fails the refine before `uuid()` ever parses it, so "nothing chosen" and
   * "chosen value is garbage" are distinguishable even though the form itself only ever
   * submits real ids. The database's `venues_section_id_fkey` is the backstop that makes
   * the whole chain safe against reordering.
   */
  sectionId: z
    .string()
    .trim()
    .refine((value) => value.length > 0, { message: VENUE_FIELD_ERROR.sectionRequired })
    .pipe(z.uuid({ message: VENUE_FIELD_ERROR.sectionInvalid })),

  // Optional in the database. An empty textarea is stored as NULL rather than `""`, so
  // "no description" has one representation instead of two.
  description: z
    .string()
    .transform((value) => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .refine((value) => value === null || value.length <= DESCRIPTION_MAX_LENGTH, {
      message: VENUE_FIELD_ERROR.descriptionTooLong,
    }),

  displayOrder: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => /^\d+$/.test(value), {
      // A digits-only test rejects "1.5", "1e3", "-0", and " 12 " in one rule, before
      // `Number()` gets a chance to quietly accept any of them.
      message: VENUE_FIELD_ERROR.displayOrderInvalid,
    })
    .transform((value) => Number(value))
    .refine((value) => Number.isInteger(value) && value >= 0, {
      message: VENUE_FIELD_ERROR.displayOrderNegative,
    })
    .refine((value) => value <= DISPLAY_ORDER_MAX, {
      message: VENUE_FIELD_ERROR.displayOrderTooLarge,
    }),

  isActive: checkbox,
});

export type VenueInput = z.output<typeof venueInputSchema>;

/** Field-keyed validation messages, in the shape the form renders. */
export type VenueFieldErrors = Partial<Record<keyof VenueInput, VenueFieldError>>;

/**
 * Parses `FormData` into a validated venue, or into per-field error keys.
 *
 * Returns rather than throws: a validation failure is an expected outcome of a form
 * submission, not an exception, and the action needs to hand the errors back to be
 * rendered beside the offending fields.
 */
export function parseVenueForm(
  formData: FormData,
): { ok: true; data: VenueInput } | { ok: false; errors: VenueFieldErrors } {
  const raw = {
    name: String(formData.get("name") ?? ""),
    sectionId: String(formData.get("sectionId") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    displayOrder: String(formData.get("displayOrder") ?? ""),
    isActive: formData.get("isActive") as "on" | null,
  };

  const result = venueInputSchema.safeParse(raw);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  const errors: VenueFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) {
      errors[field as keyof VenueInput] = issue.message as VenueFieldError;
    }
  }

  return { ok: false, errors };
}
