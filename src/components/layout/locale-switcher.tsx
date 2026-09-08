import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { navItemHref } from "@/components/layout/nav-items";
import { routing } from "@/i18n/routing";
import type { SectionId } from "@/lib/constants/sections";
import { cn } from "@/lib/utils/cn";

export type LocaleSwitcherTone = "default" | "inverse";

interface LocaleSwitcherProps {
  /** The currently active locale. */
  readonly locale: Locale;
  /** The nav destination of the page being viewed, so the switch keeps position. */
  readonly current?: SectionId;
  /** `"inverse"` on dark surfaces. */
  readonly tone?: LocaleSwitcherTone;
}

const TONE_CLASS: Record<LocaleSwitcherTone, string> = {
  default: "text-foreground hover:bg-surface-muted",
  inverse: "text-foreground-inverse hover:bg-surface-inverse-muted",
};

/**
 * Server-rendered language toggle.
 *
 * Two locales exist (Arabic, English), so switching is a single decision: leave the
 * current one and land in the other. The control is therefore one compact anchor
 * carrying a translate symbol instead of a row of language pills - the header stays
 * uncluttered next to the theme toggle and the mobile menu button.
 *
 * Design decisions carried over from the pill version:
 * - A plain `<a>` element, not `next/link`. A locale switch must swap the
 *   document's `lang` and `dir`, so a full document load is the correct and most
 *   robust behaviour - and it keeps this component at zero client-side JS.
 *   Hrefs are still produced by next-intl's `getPathname`, so they stay in sync
 *   with the routing configuration.
 * - The accessible name is authored in the *current* locale ("Switch language to
 *   العربية") while the target still appears in its own script, so a speaker can
 *   always recognise the language they would land in. The same text is repeated in
 *   `title` for the pointer hover tooltip.
 *
 * POSITION IS PRESERVED. The page chrome passes the page's nav destination via
 * `current`, and the switch resolves that destination in the *target* locale - so
 * switching from `/en/menu` lands on `/ar/menu`, and from a homepage About anchor
 * on the matching Arabic fragment. Pages outside the navigation fall back to the
 * target homepage.
 */
export async function LocaleSwitcher({ locale, current, tone = "default" }: LocaleSwitcherProps) {
  const [tCommon, tLocales] = await Promise.all([
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "locales" }),
  ]);

  const target = routing.locales.find((candidate) => candidate !== locale);
  if (!target) {
    return null;
  }

  const targetLabel = tLocales(target);
  const label = tCommon("switchLanguageTo", { language: targetLabel });

  // Keep the visitor's position: switching languages lands on the same page in
  // the other locale (falling back to the homepage for pages outside the nav).
  const targetHref = navItemHref(current ?? "home", target);

  return (
    <a
      href={targetHref}
      hrefLang={target}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-control",
        "transition-colors duration-150 ease-out",
        TONE_CLASS[tone],
      )}
    >
      {/* Decorative: the link is named by aria-label. */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-6"
      >
        <path d="m5 8 6 6" />
        <path d="m4 14 6-6 2-3" />
        <path d="M2 5h12" />
        <path d="M7 2h1" />
        <path d="m22 22-5-10-5 10" />
        <path d="M14 18h6" />
      </svg>
      <span className="sr-only">{label}</span>
    </a>
  );
}
