import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { getNavItems } from "@/components/layout/nav-items";
import { Section } from "@/components/ui/section";
import { ADMIN_ENTRY_HREF } from "@/lib/constants/admin";
import type { SectionId } from "@/lib/constants/sections";
import type { SiteSettings } from "@/types/content";

/**
 * Site footer.
 *
 * Dark olive band, which gives the page a definite end and lets the gold accent
 * carry the wordmark. `Section` sets `data-surface="inverse"`, so the focus ring
 * flips to cream automatically - an olive ring here would be invisible.
 *
 * Social links appear only when the database publishes a real URL. No account is
 * invented, and no placeholder icon row is rendered: `site_settings.instagram_url`
 * is null today, so nothing shows.
 *
 * The language toggle repeats the header's control as a plain link (not a second
 * `nav` landmark with the same name), sitting under the "Language" heading that
 * gives it context.
 *
 * The year is resolved when the page is rendered. These routes are statically
 * prerendered, so it is fixed at build time - correct for a site that is rebuilt on
 * content changes, and worth knowing if a build is ever left standing across New
 * Year. It is passed as a string so the Arabic catalogue keeps Western digits
 * instead of ICU converting it to Arabic-Indic numerals.
 */

interface SiteFooterProps {
  readonly locale: Locale;
  /** The nav destination of the page being viewed, for position-preserving
      locale switches. */
  readonly current?: SectionId;
  /** Resolved site settings, or null when none are publicly visible. */
  readonly settings: SiteSettings | null;
}

export async function SiteFooter({ locale, current, settings }: SiteFooterProps) {
  const [t, tNav, tContact, items] = await Promise.all([
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "contact" }),
    getNavItems(locale),
  ]);

  const tFooter = await getTranslations({ locale, namespace: "footer" });

  // The localized catalogue name, not `site_settings.site_name`. That column holds a
  // single language, so on the Arabic page it would print the English name - and the
  // header already uses the catalogue. `settings` is still needed for the social link.
  const siteName = t("siteName");

  return (
    <Section as="footer" surface="inverse">
      <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
        {/*
          Same admin entry point as the header logo, kept consistent so "the logo"
          behaves one way everywhere. `tone="inverse"` renders the site name in the
          display face rather than the logo image: the supplied mark is single-colour
          olive, which is invisible on this olive band, and recolouring it is not
          permitted. A reversed export of the logo would let the image be used here.
        */}
        <a href={ADMIN_ENTRY_HREF} className="inline-flex shrink-0 items-center rounded-control">
          <Logo label={siteName} size="lg" tone="inverse" />
        </a>

        <div className="flex flex-col gap-10 sm:flex-row sm:gap-16">
          <nav aria-label={tNav("footerLabel")}>
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.href}
                    className="text-sm text-foreground-inverse-muted underline-offset-4 transition-colors duration-150 ease-out hover:text-foreground-inverse hover:underline"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-4">
            <p className="text-eyebrow font-semibold tracking-eyebrow text-accent uppercase">
              {t("language")}
            </p>
            <LocaleSwitcher locale={locale} current={current} tone="inverse" />

            {settings?.instagramUrl ? (
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-foreground-inverse-muted underline decoration-accent decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:text-foreground-inverse"
              >
                {tContact("followUs")}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-12 border-t border-border-inverse pt-8 text-sm text-foreground-inverse-muted">
        {tFooter("copyright", { year: String(new Date().getFullYear()), siteName })}
      </p>
    </Section>
  );
}
