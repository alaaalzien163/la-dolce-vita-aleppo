import { hasLocale } from "next-intl";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicPage } from "@/components/layout/public-page";
import { Departments } from "@/components/sections/departments";
import { routing } from "@/i18n/routing";
import { getPublicDepartments } from "@/lib/data/sections";
import { buildPublicPageMetadata } from "@/lib/seo/metadata";

interface DepartmentsPageProps {
  readonly params: Promise<{ readonly locale: string }>;
}

export async function generateMetadata({ params }: DepartmentsPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return buildPublicPageMetadata(locale, "departments");
}

/**
 * Dedicated Departments page - the full view of every active department.
 *
 * The homepage only shows a bounded preview of this dataset; this page renders
 * all publishable departments (`getPublicDepartments` scopes to active rows and
 * the component filters out name-only records that have nothing to show).
 */
export default async function DepartmentsPage({ params }: DepartmentsPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const departments = await getPublicDepartments();

  return (
    <PublicPage locale={locale} current="departments">
      <Departments locale={locale} result={departments} headingLevel={1} />
    </PublicPage>
  );
}
