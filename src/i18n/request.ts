import { hasLocale, type Locale, type Messages } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";

import { routing } from "./routing";

/**
 * Message catalogs are loaded through an explicit map rather than a dynamic
 * `import(`../../messages/${locale}.json`)` template for two reasons:
 *
 * 1. The bundler resolves static specifiers, so no dynamic-import context is
 *    created and no unreachable catalog can be pulled in.
 * 2. The `satisfies` clause makes TypeScript verify that every locale has a
 *    catalog, and that each catalog is structurally assignable to `Messages`
 *    (derived from `ar.json`). A key missing from `en.json` fails typecheck.
 */
const messageLoaders = {
  ar: () => import("../../messages/ar.json"),
  en: () => import("../../messages/en.json"),
} satisfies Record<Locale, () => Promise<{ default: Messages }>>;

export default getRequestConfig(async ({ locale }) => {
  // `locale` is only set when a caller passes it explicitly, e.g.
  // `getTranslations({ locale })`. Otherwise it is read from the `[locale]`
  // root param, which keeps pages eligible for static rendering.
  let resolvedLocale: Locale;

  if (locale) {
    resolvedLocale = locale;
  } else {
    const paramValue = await rootParams.locale();

    if (!hasLocale(routing.locales, paramValue)) {
      notFound();
    }

    resolvedLocale = paramValue;
  }

  const { default: messages } = await messageLoaders[resolvedLocale]();

  // No `timeZone` is set yet: it must match the restaurant's actual location so
  // that opening hours format identically on server and client. Guessing one
  // would silently produce wrong times. Set it when the venue is confirmed.
  return {
    locale: resolvedLocale,
    messages,
  };
});
