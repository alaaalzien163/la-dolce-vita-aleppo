import { hasLocale } from "next-intl";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicPage } from "@/components/layout/public-page";
import { MenuSection } from "@/components/sections/menu";
import { routing } from "@/i18n/routing";
import { getPublicMenuBand } from "@/lib/data/menu";
import { buildPublicPageMetadata } from "@/lib/seo/metadata";

interface MenuPageProps {
  readonly params: Promise<{ readonly locale: string }>;
}

export async function generateMetadata({ params }: MenuPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return buildPublicPageMetadata(locale, "menu");
}

/**
 * Dedicated Menu page - the complete public menu.
 *
 * This is the only page that fetches the full menu hierarchy. The homepage never
 * calls `getPublicMenuBand`; it shows catalogue copy and a CTA into this page.
 *
 * `getPublicMenuBand` keeps the free-plan shape: it scopes venues → menus → main
 * categories → categories → available items to active ancestors in a fixed number
 * of chained queries (one per level), never one query per row.
 */
export default async function MenuPage({ params }: MenuPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const menu = await getPublicMenuBand();

  return (
    <PublicPage locale={locale} current="menu">
      <MenuSection locale={locale} result={menu} headingLevel={1} />
    </PublicPage>
  );
}
