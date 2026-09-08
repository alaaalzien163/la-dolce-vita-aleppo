import { hasLocale, type Locale } from "next-intl";
import { cookies } from "next/headers";

import { routing } from "@/i18n/routing";

/**
 * Locale for the unprefixed `/admin` routes.
 *
 * WHY THE ADMIN AREA IS NOT LOCALE-PREFIXED. The public site runs
 * `localePrefix: "always"`, so every public URL carries `/ar` or `/en`. Mirroring
 * that for the dashboard would mean `/ar/admin/login` and `/en/admin/login` - two
 * URLs for one private tool, a locale segment in every admin link and redirect, and
 * the proxy's auth guard having to match a locale-prefixed pattern. The dashboard has
 * one user and no SEO surface, so none of that buys anything.
 *
 * Instead `/admin` sits outside the locale tree and reads the language preference
 * that next-intl already persists. Its middleware writes `NEXT_LOCALE` when it
 * negotiates a locale, and the switcher updates it, so whichever language the admin
 * last used on the public site is the language the dashboard appears in. One
 * preference, one cookie, no second routing scheme - which is what keeps this from
 * touching the public i18n architecture at all.
 *
 * Falls back to `routing.defaultLocale` when the cookie is absent or unrecognised, so
 * a first visit straight to `/admin/login` still renders in Arabic rather than
 * failing.
 *
 * Reading a cookie makes every admin route dynamic. That is required anyway: these
 * responses are user-specific and must never be cached.
 */
/**
 * Name of the cookie next-intl writes when it negotiates a locale.
 *
 * `routing.localeCookie` is typed as the *input* shape - `boolean | CookieAttributes |
 * undefined` - because a project may pass `true`, `false`, or a partial override. Only
 * the object form carries a name, so it is read when present and otherwise falls back
 * to next-intl's documented default. `routing.ts` does not override it, so the default
 * is what is in use; taking the value from the config when it is available means an
 * override there would still be picked up here.
 */
export const LOCALE_COOKIE_NAME =
  typeof routing.localeCookie === "object" && typeof routing.localeCookie.name === "string"
    ? routing.localeCookie.name
    : "NEXT_LOCALE";

export async function getAdminLocale(): Promise<Locale> {
  if (routing.localeCookie === false) {
    return routing.defaultLocale;
  }

  const cookieStore = await cookies();
  const candidate = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  return hasLocale(routing.locales, candidate) ? candidate : routing.defaultLocale;
}
