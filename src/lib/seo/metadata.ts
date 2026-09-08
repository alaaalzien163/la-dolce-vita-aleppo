import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { routing } from "@/i18n/routing";

import { getSiteUrl } from "./site-url";

/**
 * Open Graph locale identifiers (`language_TERRITORY`), which are not the same
 * strings as the routing locales.
 */
const OPEN_GRAPH_LOCALE: Record<Locale, string> = {
  ar: "ar_AR",
  en: "en_US",
};

/** A dedicated public page keyed into the metadata catalogue. */
export type PublicPageKey = "departments" | "menu";

const PUBLIC_PAGE_PATH: Record<PublicPageKey, string> = {
  departments: "/departments",
  menu: "/menu",
};

function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const candidate of routing.locales) {
    languages[candidate] = `/${candidate}${path}`;
  }
  languages["x-default"] = `/${routing.defaultLocale}${path}`;
  return languages;
}

/**
 * Builds the per-locale document metadata for a public page.
 *
 * Canonical strategy under `localePrefix: "always"`: the canonical URL for a
 * locale is its prefixed path (`/ar`, `/en/menu`, ...), never an unprefixed
 * variant, and `x-default` points at the default locale's copy of the same page.
 */
export async function buildPageMetadata(
  locale: Locale,
  options: { readonly path: string; readonly title: string; readonly description: string },
): Promise<Metadata> {
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const pageUrl = `/${locale}${options.path}`;

  return {
    metadataBase: getSiteUrl(),
    title: options.title,
    description: options.description,
    alternates: {
      canonical: pageUrl,
      languages: languageAlternates(options.path),
    },
    openGraph: {
      type: "website",
      siteName: tCommon("siteName"),
      title: options.title,
      description: options.description,
      url: pageUrl,
      locale: OPEN_GRAPH_LOCALE[locale],
      alternateLocale: routing.locales
        .filter((candidate) => candidate !== locale)
        .map((candidate) => OPEN_GRAPH_LOCALE[candidate]),
    },
  };
}

/** Homepage metadata, composed from the root metadata catalogue keys. */
export async function buildLocaleMetadata(locale: Locale): Promise<Metadata> {
  const tMetadata = await getTranslations({ locale, namespace: "metadata" });

  return buildPageMetadata(locale, {
    path: "",
    title: tMetadata("title"),
    description: tMetadata("description"),
  });
}

/** Metadata for a dedicated public page (Departments or Menu). */
export async function buildPublicPageMetadata(
  locale: Locale,
  page: PublicPageKey,
): Promise<Metadata> {
  const [tMetadata, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "metadata" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  return buildPageMetadata(locale, {
    path: PUBLIC_PAGE_PATH[page],
    title: `${tMetadata(`${page}Title`)} · ${tCommon("siteName")}`,
    description: tMetadata(`${page}Description`),
  });
}
