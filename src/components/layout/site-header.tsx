import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getNavItems } from "@/components/layout/nav-items";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Container } from "@/components/ui/container";
import { ADMIN_ENTRY_HREF } from "@/lib/constants/admin";
import type { SectionId } from "@/lib/constants/sections";
import { cn } from "@/lib/utils/cn";

/**
 * Sticky site header.
 *
 * A Server Component apart from the two interactive controls: the mobile disclosure
 * and the night-mode toggle, so the desktop navigation, the wordmark, and the
 * language toggle cost no client JavaScript.
 *
 * `sticky` rather than `fixed`: it keeps the header in normal flow, so the page
 * below is not covered and no compensating top padding is needed anywhere. The
 * `Section` primitive already sets `scroll-mt-24`, which clears this header when
 * an in-page anchor is followed.
 *
 * `relative` is required for the mobile panel, which positions itself against this
 * element with `top-full` and `inset-x-0`.
 *
 * The active nav item is marked with `aria-current="page"`, decided by the page
 * that renders this header: the page's `current` id is the only truthful signal a
 * static page can provide (a scroll observer would add client JavaScript for a
 * highlight no visitor needs). About and Contact are homepage fragments, so they
 * are only ever `current` on the homepage.
 */

interface SiteHeaderProps {
  readonly locale: Locale;
  /** The nav item naming the page being viewed, if the page is in the nav. */
  readonly current?: SectionId;
}

export async function SiteHeader({ locale, current }: SiteHeaderProps) {
  const [t, tNav, items] = await Promise.all([
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "nav" }),
    getNavItems(locale),
  ]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border",
        // Slightly translucent so content scrolling underneath reads as continuous,
        // with an opaque fallback for browsers without backdrop-filter.
        "bg-background/92 supports-[backdrop-filter]:backdrop-blur-sm",
      )}
    >
      <Container className="relative flex h-16 items-center gap-4 sm:h-20">
        {/*
          The logo links to the admin sign-in page, not back to the top of the page.
          Requested behaviour, and deliberately undocumented in the UI - it is the only
          entry point to the dashboard, so there is no visible "admin" link for a
          visitor to find. See `ADMIN_ENTRY_HREF` in `@/lib/constants/admin`.

          A plain anchor, not next-intl's `Link`: `/admin/login` sits outside the locale
          tree, so there is no prefix to add and a full document load is correct - the
          admin area has its own root layout.

          The logo's `alt` is the localized site name, which becomes this link's
          accessible name, so no `aria-label` is needed and nothing is announced twice.
        */}
        <a href={ADMIN_ENTRY_HREF} className="inline-flex shrink-0 items-center rounded-control">
          <Logo label={t("siteName")} size="md" priority />
        </a>

        <nav aria-label={tNav("primaryLabel")} className="hidden md:ms-auto md:block">
          <ul className="flex items-center gap-1">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  // The homepage is the current page only when `current === "home"`.
                  // About/Contact point at homepage fragments, so they are current
                  // only on the homepage; a dedicated page marks its own item.
                  aria-current={item.id === current ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center rounded-control px-3 text-sm font-medium",
                    "transition-colors duration-150 ease-out hover:bg-surface-muted active:bg-border",
                    "aria-[current=page]:text-accent-ink",
                  )}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ms-auto flex items-center gap-1 md:ms-0">
          <ThemeToggle toDarkLabel={tNav("toDarkMode")} toLightLabel={tNav("toLightMode")} />
          <LocaleSwitcher locale={locale} current={current} />
          <MobileNav
            items={items}
            openLabel={tNav("openMenu")}
            closeLabel={tNav("closeMenu")}
            menuLabel={tNav("menuLabel")}
          />
        </div>
      </Container>
    </header>
  );
}
