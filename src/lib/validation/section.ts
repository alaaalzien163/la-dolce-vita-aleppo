import { z } from "zod";

import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "@/lib/utils/slug";

/**
 * Validation for `public.sections`, shared by the client hint and the server action.
 *
 * SERVER VALIDATION IS THE ONLY VALIDATION THAT COUNTS. A Server Action is a public HTTP
 * endpoint; anything reaching it can be crafted by hand, so `FormData` is parsed here
 * before it goes anywhere near the database. The browser's own `required` and `pattern`
 * attributes remain useful for telling the admin what is wrong without a round trip, but
 * they are a convenience, not a gate.
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

export const SECTION_FIELD_ERROR = {
  nameRequired: "nameRequired",
  nameTooLong: "nameTooLong",
  slugRequired: "slugRequired",
  slugInvalid: "slugInvalid",
  slugTooLong: "slugTooLong",
  descriptionTooLong: "descriptionTooLong",
  displayOrderInvalid: "displayOrderInvalid",
  displayOrderNegative: "displayOrderNegative",
  displayOrderTooLarge: "displayOrderTooLarge",
} as const;

export type SectionFieldError = (typeof SECTION_FIELD_ERROR)[keyof typeof SECTION_FIELD_ERROR];

/**
 * `is_active` arrives from a checkbox, which is absent from `FormData` when unchecked
 * rather than present as `false`. Treating a missing value as `false` is what makes
 * unchecking actually persist.
 */
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null(), z.undefined()])
  .transform((value) => value === "on" || value === "true");

export const sectionInputSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, { message: SECTION_FIELD_ERROR.nameRequired })
    .refine((value) => value.length <= NAME_MAX_LENGTH, {
      message: SECTION_FIELD_ERROR.nameTooLong,
    }),

  slug: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .refine((value) => value.length > 0, { message: SECTION_FIELD_ERROR.slugRequired })
    .refine((value) => value.length <= SLUG_MAX_LENGTH, {
      message: SECTION_FIELD_ERROR.slugTooLong,
    })
    .refine((value) => SLUG_PATTERN.test(value), {
      message: SECTION_FIELD_ERROR.slugInvalid,
    }),

  // Optional in the database. An empty textarea is stored as NULL rather than `""`, so
  // "no description" has one representation instead of two.
  description: z
    .string()
    .transform((value) => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .refine((value) => value === null || value.length <= DESCRIPTION_MAX_LENGTH, {
      message: SECTION_FIELD_ERROR.descriptionTooLong,
    }),

  displayOrder: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => /^\d+$/.test(value), {
      // A digits-only test rejects "1.5", "1e3", "-0", and " 12 " in one rule, before
      // `Number()` gets a chance to quietly accept any of them.
      message: SECTION_FIELD_ERROR.displayOrderInvalid,
    })
    .transform((value) => Number(value))
    .refine((value) => Number.isInteger(value) && value >= 0, {
      message: SECTION_FIELD_ERROR.displayOrderNegative,
    })
    .refine((value) => value <= DISPLAY_ORDER_MAX, {
      message: SECTION_FIELD_ERROR.displayOrderTooLarge,
    }),

  isActive: checkbox,
});

export type SectionInput = z.output<typeof sectionInputSchema>;

/** Field-keyed validation messages, in the shape the form renders. */
export type SectionFieldErrors = Partial<Record<keyof SectionInput, SectionFieldError>>;

/**
 * Parses `FormData` into a validated section, or into per-field error keys.
 *
 * Returns rather than throws: a validation failure is an expected outcome of a form
 * submission, not an exception, and the action needs to hand the errors back to be
 * rendered beside the offending fields.
 */
export function parseSectionForm(
  formData: FormData,
): { ok: true; data: SectionInput } | { ok: false; errors: SectionFieldErrors } {
  const raw = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    displayOrder: String(formData.get("displayOrder") ?? ""),
    isActive: formData.get("isActive") as "on" | null,
  };

  const result = sectionInputSchema.safeParse(raw);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  const errors: SectionFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) {
      errors[field as keyof SectionInput] = issue.message as SectionFieldError;
    }
  }

  return { ok: false, errors };
}
