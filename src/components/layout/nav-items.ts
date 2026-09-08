import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";

import { getPathname } from "@/i18n/navigation";
import type { SectionId } from "@/lib/constants/sections";

/**
 * Public navigation.
 *
 * The site is now multi-page: the homepage carries preview bands while
 * Departments and Menu live on dedicated routes. Each nav item resolves
 * to a localized destination:
 *
 *   - Departments and Menu → their dedicated page (`/<locale>/departments`,
 *     `/menu`).
 *   - Home, About, Contact → the homepage (`/<locale>`), with About and Contact
 *     carrying the homepage fragment (`#about`, `#contact`). From any page those
 *     links land on the homepage at the right section; on the homepage itself the
 *     browser treats them as same-document fragment scrolls.
 *
 * Labels come from the `common` namespace, whose keys match the section ids -
 * adding a page without translating it fails typecheck. Items are serializable so
 * the mobile menu (a Client Component) can receive them as plain props with no
 * message catalogue or provider shipped to the browser.
 */

/** A public navigation destination. */
export interface NavItem {
  readonly id: SectionId;
  readonly href: string;
  readonly label: string;
}

/** Order in which nav items appear, matching the sitemap order. */
export const NAV_ORDER: readonly SectionId[] = [
  "home",
  "about",
  "departments",
  "menu",
  "contact",
] as const;

/** The app-relative route each nav item points at (fragments applied separately). */
const ROUTE: Record<SectionId, string> = {
  home: "/",
  about: "/",
  departments: "/departments",
  menu: "/menu",
  contact: "/",
};

/** Homepage fragments for sections that only live on the homepage. */
const FRAGMENT: Partial<Record<SectionId, string>> = {
  about: "#about",
  contact: "#contact",
};

/**
 * The localized href for one nav destination in `locale` - either the dedicated
 * page (`/en/menu`) or the homepage (with a fragment for About and Contact).
 * Exported so the language switcher can build the *target* locale's equivalent
 * of the page currently being viewed.
 */
export function navItemHref(id: SectionId, locale: Locale): string {
  const route = ROUTE[id];
  const fragment = FRAGMENT[id];
  const root = getPathname({ href: "/", locale });

  return route === "/"
    ? fragment
      ? `${root}${fragment}`
      : root
    : getPathname({ href: route, locale });
}

export async function getNavItems(locale: Locale): Promise<readonly NavItem[]> {
  const t = await getTranslations({ locale, namespace: "common" });

  return NAV_ORDER.map((id) => ({ id, href: navItemHref(id, locale), label: t(id) }));
}
