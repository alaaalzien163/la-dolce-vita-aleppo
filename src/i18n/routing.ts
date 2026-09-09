import { defineRouting } from "next-intl/routing";

/**
 * Single source of truth for locale routing.
 *
 * `localePrefix: "always"` means every URL carries its locale (`/ar`, `/en`).
 * There is no unprefixed variant, so each page has exactly one canonical URL
 * and `/` is only ever a redirect - never an indexable document.
 */
export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "en",
  localePrefix: "always",

  // Negotiate `/` from the `NEXT_LOCALE` cookie first, then `Accept-Language`,
  // falling back to `defaultLocale` ("en").
  localeDetection: true,

  // Emit a `Link` response header advertising alternates to crawlers. This
  // complements the `alternates.languages` metadata rendered into <head>.
  alternateLinks: true,
});
