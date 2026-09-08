import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { buttonStyles } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { getPathname } from "@/i18n/navigation";
import { SECTION_IDS } from "@/lib/constants/sections";

/**
 * Homepage Menu teaser.
 *
 * The full menu lives on the dedicated `/menu` page and is never fetched for the
 * homepage. This band is the landing page's honest alternative: the localized
 * heading plus a single CTA into the full menu. No items, no categories, no venue
 * rows are loaded to render it - just catalogue copy and one link.
 */
interface MenuPreviewProps {
  readonly locale: Locale;
}

const HEADING_ID = "menu-heading";

export async function MenuPreview({ locale }: MenuPreviewProps) {
  const t = await getTranslations({ locale, namespace: "menu" });

  return (
    <Section id={SECTION_IDS.menu} surface="muted" labelledBy={HEADING_ID}>
      <SectionHeading
        id={HEADING_ID}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <p className="mt-12 text-center">
        <a
          href={getPathname({ href: "/menu", locale })}
          className={buttonStyles({ variant: "secondary", size: "lg" })}
        >
          {t("cta")}
        </a>
      </p>
    </Section>
  );
}
