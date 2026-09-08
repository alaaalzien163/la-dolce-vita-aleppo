import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { PublicPage } from "@/components/layout/public-page";
import { About } from "@/components/sections/about";
import { Contact } from "@/components/sections/contact";
import { Departments } from "@/components/sections/departments";
import { Hero } from "@/components/sections/hero";
import { MenuPreview } from "@/components/sections/menu-preview";
import { routing } from "@/i18n/routing";
import { getPublicDepartments } from "@/lib/data/sections";
import { getSiteSettings } from "@/lib/data/site-settings";
import { getPublicStudioInfo } from "@/lib/data/studio-info";

interface HomePageProps {
  readonly params: Promise<{ readonly locale: string }>;
}

/**
 * Homepage - a premium landing page with bounded previews.
 *
 * The full Departments and Menu datasets do NOT render here. Each heavy surface
 * is either a small bounded preview or a CTA into its dedicated page:
 *
 *   - Departments: a `previewCount` slice of the publishable departments plus a
 *     "View all departments" CTA to `/departments`.
 *   - Menu: NO database query at all - `MenuPreview` is catalogue copy and a CTA
 *     to `/menu`.
 * QUERY BUDGET (happy path): studio_info (1) + sections (1) + site_settings (1,
 * React-`cache`d and shared with the page chrome) = three queries per locale,
 * with no menu tree fetched.
 *
 * Sections are presentational and take resolved `QueryResult` props; only this
 * page and the dedicated pages perform queries.
 */
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const [departments, siteSettings, studioInfo] = await Promise.all([
    getPublicDepartments(),
    getSiteSettings(),
    getPublicStudioInfo(),
  ]);

  return (
    <PublicPage locale={locale} current="home">
      <Hero locale={locale} />
      <About locale={locale} result={studioInfo} />
      <Departments locale={locale} result={departments} previewCount={3} />
      <MenuPreview locale={locale} />
      <Contact locale={locale} result={siteSettings} />
    </PublicPage>
  );
}
