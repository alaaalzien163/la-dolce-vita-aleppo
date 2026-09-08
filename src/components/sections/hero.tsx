import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { buttonStyles } from "@/components/ui/button";
import { DecorativeVideo } from "@/components/ui/decorative-video";
import { Section } from "@/components/ui/section";
import { getPathname } from "@/i18n/navigation";
import { SECTION_IDS } from "@/lib/constants/sections";

/**
 * Hero band.
 *
 * Owns the page's single `h1`; every other section uses `h2` via `SectionHeading`,
 * which cannot render an `h1` by design.
 *
 * Copy makes no factual claims - no founding year, no locations, no awards, no
 * statistics. It describes an intent, not a history, which is all that can honestly
 * be said before real content is published.
 *
 * The band uses the same semantic page surface as the translucent site header.
 * This keeps the top of the page visually continuous in light and dark themes,
 * while the deep media box retains the approved burgundy palette as a contained
 * editorial accent. The primary CTA keeps its gold fill and the secondary CTA
 * uses the standard outline skin, both with sufficient contrast on this surface.
 *
 * Two columns from `lg` up, stacked below. The visual is second in source order so
 * that on a narrow viewport the heading and CTAs come first, and a keyboard user
 * reaches the actions before the decoration.
 *
 * The primary CTA navigates to the dedicated Departments page; the secondary stays
 * a same-document fragment (`#contact`), so plain anchors carrying `buttonStyles`
 * are correct for both - a locale-prefixed document load for the page and a native
 * scroll for the fragment, with no client routing in either case.
 */

interface HeroProps {
  readonly locale: Locale;
}

export async function Hero({ locale }: HeroProps) {
  const t = await getTranslations({ locale, namespace: "hero" });
  // Departments are a dedicated page now, so the primary CTA navigates there.
  const departmentsHref = getPathname({ href: "/departments", locale });

  return (
    <Section spacing="lg" width="wide" className="overflow-hidden">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6 xl:col-span-5">
          <h1 className="text-display-lg font-medium text-heading">{t("title")}</h1>

          <p className="mt-6 max-w-measure text-lg text-foreground-muted">
            <span className="block">{t("descriptionLine1")}</span>
            <span className="block">{t("descriptionLine2")}</span>
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a href={departmentsHref} className={buttonStyles({ size: "lg" })}>
              {t("primaryCta")}
            </a>
            <a
              href={`#${SECTION_IDS.contact}`}
              className={buttonStyles({ variant: "outline", size: "lg" })}
            >
              {t("secondaryCta")}
            </a>
          </div>
        </div>

        <div className="lg:col-span-6 lg:col-start-7 xl:col-span-7">
          <DecorativeVideo
            src="/hero.mp4"
            tone="deep"
            className="aspect-[5/4] w-full sm:aspect-[3/2]"
          />
        </div>
      </div>
    </Section>
  );
}
