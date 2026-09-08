import { z } from "zod";

/**
 * Validation for `public.site_settings`, the settings singleton.
 *
 * SERVER VALIDATION IS THE ONLY VALIDATION THAT COUNTS. `maxLength` and
 * `inputMode` on the client are hints for the human using the form; the sketch
 * of an email or URL check in the browser would be just another opinion, so
 * nothing below is duplicated on the client. The schema is the authority.
 *
 * The columns are plain `text` in Postgres, so lengths are capped here - an
 * unbounded text field is a denial-of-service field in the same way that a
 * 4.5 MB upload is. The caps are generous enough that no legitimate Arabic
 * address or tagline hits them: site name 160, tagline and address 500,
 * phone 60, email 254, URLs 2048.
 *
 * `opening_hours` is deliberately not part of this schema. Its JSON shape has
 * never been defined, and nothing public reads it yet, so a form input would
 * only be a way to write arbitrary JSON into a server-owned column. The action
 * omits the column from every write and the long-lived row keeps whatever it
 * holds untouched.
 *
 * Optional text stores `NULL` when blank rather than `""`, so "no value" has
 * one representation instead of two.
 */

const SITE_NAME_MAX_LENGTH = 160;
const TAGLINE_MAX_LENGTH = 300;
const ADDRESS_MAX_LENGTH = 500;
const PHONE_MAX_LENGTH = 60;
const EMAIL_MAX_LENGTH = 254;
const URL_MAX_LENGTH = 2048;

export const SITE_SETTINGS_FIELD_ERROR = {
  siteNameRequired: "siteNameRequired",
  siteNameTooLong: "siteNameTooLong",
  taglineTooLong: "taglineTooLong",
  phoneTooLong: "phoneTooLong",
  emailInvalid: "emailInvalid",
  emailTooLong: "emailTooLong",
  addressTooLong: "addressTooLong",
  googleMapsUrlInvalid: "googleMapsUrlInvalid",
  googleMapsUrlTooLong: "googleMapsUrlTooLong",
  instagramUrlInvalid: "instagramUrlInvalid",
  instagramUrlTooLong: "instagramUrlTooLong",
} as const;

export type SiteSettingsFieldError =
  (typeof SITE_SETTINGS_FIELD_ERROR)[keyof typeof SITE_SETTINGS_FIELD_ERROR];

/** A full http(s) URL, without credentials, that a browser can reach. */
function isPublicHttpUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    (url.protocol === "http:" || url.protocol === "https:") &&
    url.hostname.length > 0 &&
    url.username.length === 0 &&
    url.password.length === 0
  );
}

/** A plausible mailto address: one `@`, a non-empty local part and a dotted domain. */
function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Optional text that becomes `NULL` when blank. The length is checked on the
 * trimmed value, so whitespace can neither slip past the cap nor leave a
 * fields-worth of blanks stored.
 */
function optionalText(maxLength: number, tooLong: SiteSettingsFieldError) {
  return z
    .string()
    .transform((value) => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .refine((value) => value === null || value.length <= maxLength, { message: tooLong });
}

function optionalEmail() {
  return z
    .string()
    .transform((value) => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .refine((value) => value === null || value.length <= EMAIL_MAX_LENGTH, {
      message: SITE_SETTINGS_FIELD_ERROR.emailTooLong,
    })
    .refine((value) => value === null || isEmail(value), {
      message: SITE_SETTINGS_FIELD_ERROR.emailInvalid,
    });
}

function optionalHttpUrl(invalid: SiteSettingsFieldError) {
  return z
    .string()
    .transform((value) => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .refine((value) => value === null || value.length <= URL_MAX_LENGTH, {
      message:
        invalid === SITE_SETTINGS_FIELD_ERROR.googleMapsUrlInvalid
          ? SITE_SETTINGS_FIELD_ERROR.googleMapsUrlTooLong
          : SITE_SETTINGS_FIELD_ERROR.instagramUrlTooLong,
    })
    .refine((value) => value === null || isPublicHttpUrl(value), { message: invalid });
}

const siteSettingsInputSchema = z.object({
  siteName: z
    .string()
    .trim()
    .min(1, { message: SITE_SETTINGS_FIELD_ERROR.siteNameRequired })
    .max(SITE_NAME_MAX_LENGTH, { message: SITE_SETTINGS_FIELD_ERROR.siteNameTooLong }),
  tagline: optionalText(TAGLINE_MAX_LENGTH, SITE_SETTINGS_FIELD_ERROR.taglineTooLong),
  phone: optionalText(PHONE_MAX_LENGTH, SITE_SETTINGS_FIELD_ERROR.phoneTooLong),
  email: optionalEmail(),
  address: optionalText(ADDRESS_MAX_LENGTH, SITE_SETTINGS_FIELD_ERROR.addressTooLong),
  googleMapsUrl: optionalHttpUrl(SITE_SETTINGS_FIELD_ERROR.googleMapsUrlInvalid),
  instagramUrl: optionalHttpUrl(SITE_SETTINGS_FIELD_ERROR.instagramUrlInvalid),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsInputSchema>;

/**
 * Per-field error keys keyed by the form's field names, so the client form can
 * show the localized message under the field that produced it.
 */
export type SiteSettingsFormValues = {
  siteName?: SiteSettingsFieldError;
  tagline?: SiteSettingsFieldError;
  phone?: SiteSettingsFieldError;
  email?: SiteSettingsFieldError;
  address?: SiteSettingsFieldError;
  googleMapsUrl?: SiteSettingsFieldError;
  instagramUrl?: SiteSettingsFieldError;
};

/**
 * Parses the raw form. FormData values are always strings when the form owns
 * them, but a malicious caller can submit anything else, so non-strings are
 * dropped to the empty candidate and let the schema reject them.
 */
export function parseSiteSettingsForm(
  formData: FormData,
):
  | { readonly ok: true; readonly values: SiteSettingsInput }
  | { readonly ok: false; readonly fieldErrors: SiteSettingsFormValues } {
  const candidate = {
    siteName: String(formData.get("siteName") ?? ""),
    tagline: String(formData.get("tagline") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    address: String(formData.get("address") ?? ""),
    googleMapsUrl: String(formData.get("googleMapsUrl") ?? ""),
    instagramUrl: String(formData.get("instagramUrl") ?? ""),
  };

  const parsed = siteSettingsInputSchema.safeParse(candidate);

  if (parsed.success) {
    return { ok: true, values: parsed.data };
  }

  const fieldErrors: SiteSettingsFormValues = {};

  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && field in fieldErrors === false) {
      // The message is one of SITE_SETTINGS_FIELD_ERROR: the schema below is
      // the only producer, and localization happens on the client against the
      // same key space.
      fieldErrors[field as keyof SiteSettingsFormValues] = issue.message as SiteSettingsFieldError;
    }
  }

  return { ok: false, fieldErrors };
}
