import type { Locale } from "next-intl";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SECTION_IDS, type SectionId } from "@/lib/constants/sections";
import { getSiteSettings } from "@/lib/data/site-settings";

/**
 * Shared chrome for every public locale page: header, main landmark, footer.
 *
 * The header and footer belong to the page chrome, not to individual pages, so each
 * page composes them through this shell instead of repeating the markup. The shell
 * is what fetches `site_settings`: the footer renders the Instagram link from it,
 * and `getSiteSettings` is React-`cache()`d, so when the homepage Contact band asks
 * for the same singleton later in the same render the two calls collapse into one
 * query.
 *
 * `<main>` carries the `home` anchor on every public page so the locale layout's
 * skip link always lands on the main landmark, wherever the visitor started.
 */
interface PublicPageProps {
  readonly locale: Locale;
  /** The nav item naming this page, so the header can mark `aria-current`. */
  readonly current?: SectionId;
  readonly children: ReactNode;
}

export async function PublicPage({ locale, current, children }: PublicPageProps) {
  const settings = await getSiteSettings();

  return (
    <>
      <SiteHeader locale={locale} current={current} />
      <main id={SECTION_IDS.home} className="scroll-mt-24">
        {children}
      </main>
      <SiteFooter
        locale={locale}
        current={current}
        settings={settings.status === "success" ? settings.data : null}
      />
    </>
  );
}
