import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { PublicPage } from "@/components/layout/public-page";
import { DepartmentCarousel } from "@/components/sections/department-carousel";
import { buttonStyles } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SECTION_IDS } from "@/lib/constants/sections";
import { getPublicDepartmentBySlug, getPublicDepartments } from "@/lib/data/sections";
import { getPublicSectionImages } from "@/lib/data/section-images";
import { buildPageMetadata } from "@/lib/seo/metadata";

interface DepartmentDetailPageProps {
  readonly params: Promise<{ readonly locale: string; readonly slug: string }>;
}

const HEADING_ID = "department-heading";

/**
 * Statically prerenders one page per active department, per locale.
 *
 * `/departments` and `/menu` stay on Supabase Free because each route is a static
 * file at build time; an unlisted `[slug]` (or a department that is later
 * deactivated) falls through to `notFound()` rather than a half-rendered page.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const departments = await getPublicDepartments();

  return departments.status === "success" ? departments.data.map(({ slug }) => ({ slug })) : [];
}

export async function generateMetadata({ params }: DepartmentDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const [department, tMetadata, tCommon] = await Promise.all([
    getPublicDepartmentBySlug(slug),
    getTranslations({ locale, namespace: "metadata" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  const title =
    department.status === "success"
      ? `${department.data.name} · ${tCommon("siteName")}`
      : `${tMetadata("departmentsTitle")} · ${tCommon("siteName")}`;

  const description =
    department.status === "success"
      ? (department.data.description ?? tMetadata("departmentsDescription"))
      : tMetadata("departmentsDescription");

  return buildPageMetadata(locale, {
    path: `/departments/${slug}`,
    title,
    description,
  });
}

/**
 * A single Department's page: name, description, then the image carousel, then a
 * quiet way back to the list. Pattern follows the `/departments` page - one
 * heading (`h1`, the page's only title) and a `Section` surface.
 *
 * The carousel is mounted only when the department actually has publishable images;
 * zero images renders the page normally with no empty widget.
 */
export default async function DepartmentDetailPage({ params }: DepartmentDetailPageProps) {
  const { locale, slug } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const department = await getPublicDepartmentBySlug(slug);

  if (department.status !== "success") {
    notFound();
  }

  const [images, tCarousel, tDepartments] = await Promise.all([
    getPublicSectionImages(department.data.id),
    getTranslations({ locale, namespace: "carousel" }),
    getTranslations({ locale, namespace: "departments" }),
  ]);

  const carouselLabels = {
    regionLabel: tCarousel("regionLabel"),
    previousImage: tCarousel("previousImage"),
    nextImage: tCarousel("nextImage"),
    slideLabel: tCarousel("slideLabel"),
    goToImage: tCarousel("goToImage"),
  };

  return (
    <PublicPage locale={locale} current="departments">
      <Section id={SECTION_IDS.departments} labelledBy={HEADING_ID}>
        <SectionHeading
          id={HEADING_ID}
          level={1}
          eyebrow={tDepartments("eyebrow")}
          title={<span dir="auto">{department.data.name}</span>}
          description={
            department.data.description ? (
              <span dir="auto">{department.data.description}</span>
            ) : undefined
          }
        />

        {images.status === "success" ? (
          <div className="mt-12">
            <DepartmentCarousel
              images={images.data}
              departmentName={department.data.name}
              locale={locale}
              labels={carouselLabels}
            />
          </div>
        ) : null}

        <p className="mt-12 text-center">
          <a
            href={getPathname({ href: "/departments", locale })}
            className={buttonStyles({ variant: "secondary" })}
          >
            {tDepartments("cta")}
          </a>
        </p>
      </Section>
    </PublicPage>
  );
}
