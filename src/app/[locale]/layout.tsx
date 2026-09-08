import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { SplashScreen } from "@/components/layout/splash-screen";
import { SkipLink } from "@/components/ui/skip-link";
import { getDirection } from "@/i18n/direction";
import { routing } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { THEME_INIT_SCRIPT } from "@/lib/theme/init-script";
import { buildLocaleMetadata } from "@/lib/seo/metadata";
import { SECTION_IDS } from "@/lib/constants/sections";

import "../globals.css";

/**
 * Runs before first paint to resolve the visitor's theme and stamp `data-theme` on
 * `<html>` so the dark token overrides in `globals.css` apply with no light flash.
 *
 * Resolution order: an explicit `ldv-theme` choice (localStorage) wins; otherwise
 * the operating-system `prefers-color-scheme` decides. The attribute is always set
 * to an explicit `"light"` or `"dark"` so the `<html>` DOM carries the resolved
 * state and the header toggle can read it straight back off the element.
 *
 * It is an inline script placed at the very top of `<body>`: it executes while the
 * parser is still blocked on the rest of the document, i.e. before anything can be
 * painted. Deliberately not a cookie read on the server - that would opt these
 * statically prerendered pages out of SSG.
 */
interface LocaleLayoutParams {
  readonly locale: string;
}

interface LocaleLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<LocaleLayoutParams>;
}

/**
 * Prerender both locales at build time. Combined with reading the locale from
 * `next/root-params` in `i18n/request.ts`, this keeps every localized page
 * statically rendered - no `setRequestLocale` plumbing required.
 */
export function generateStaticParams(): LocaleLayoutParams[] {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, "params">): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return buildLocaleMetadata(locale);
}

/**
 * Root layout for all localized routes.
 *
 * Every user-reachable URL is locale-prefixed by `proxy.ts`, so this layout is
 * the document root in practice and owns `<html>`/`<body>`. `lang` and `dir` are
 * derived from the validated locale: Arabic renders `lang="ar" dir="rtl"`,
 * English `lang="en" dir="ltr"`.
 *
 * `fontVariables` is applied here, once, so the next/font CSS custom properties
 * are in scope at `:root` where the `@theme` font stacks reference them.
 *
 * The skip link is the first element in `<body>`, which makes it the first
 * focusable node on every page.
 *
 * `SplashScreen` wraps the body content. It is a Client Component that plays a
 * splash overlay on every full page load; the `SkipLink` and page tree travel
 * through it as server-rendered children and are only ever visually covered, never
 * gated. While the overlay is up it marks that content `inert`, so the skip link -
 * though first in the DOM - cannot be focused until the splash has dismissed
 * itself.
 *
 * `data-scroll-behavior="smooth"` is the Next.js 16 opt-in for router-driven
 * smooth scrolling. The matching CSS is gated behind `prefers-reduced-motion`.
 *
 * The inline `THEME_INIT_SCRIPT` is the first node in `<body>`, before any content,
 * so `data-theme` is resolved before the first paint. Because that attribute is
 * written to the live `<html>` element and is not part of React's rendered output,
 * `<html>` carries `suppressHydrationWarning`.
 *
 * No `NextIntlClientProvider` is rendered: nothing in this tree is a Client
 * Component, so shipping the provider - and the messages it would serialize -
 * would be unnecessary JavaScript.
 */
export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <html
      lang={locale}
      dir={getDirection(locale)}
      data-scroll-behavior="smooth"
      className={fontVariables}
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <SplashScreen>
          <SkipLink href={`#${SECTION_IDS.home}`}>{t("skipToContent")}</SkipLink>
          {children}
        </SplashScreen>
      </body>
    </html>
  );
}
