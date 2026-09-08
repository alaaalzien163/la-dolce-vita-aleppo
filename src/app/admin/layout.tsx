import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { AdminControls } from "@/components/layout/admin-controls";
import { AdminShell } from "@/components/layout/admin-shell";
import { getAdminLocale, LOCALE_COOKIE_NAME } from "@/i18n/admin-locale";
import { getDirection } from "@/i18n/direction";
import { fontVariables } from "@/lib/fonts";
import { THEME_INIT_SCRIPT } from "@/lib/theme/init-script";

import "../globals.css";

/**
 * Root layout for `/admin`.
 *
 * A second root layout, alongside `src/app/[locale]/layout.tsx`. There is no shared
 * `src/app/layout.tsx`, so each branch of the tree owns its own `<html>` and
 * `<body>` - which is exactly what lets the dashboard sit outside the locale segment
 * while still setting `lang` and `dir` correctly.
 *
 * The same design system, tokens, and fonts as the public site. Nothing here is
 * restyled: the dashboard inherits the palette so it reads as the same product.
 *
 * `dir` comes from the cookie-resolved locale, so the admin UI mirrors for Arabic the
 * same way the public pages do.
 *
 * NOT INDEXED, NOT CACHED. `robots` tells crawlers to stay out, and `force-dynamic`
 * plus the `Cache-Control: private, no-store` header set by the proxy keep
 * authenticated responses out of every cache. A dashboard page served from a shared
 * cache would be one admin's data shown to whoever asked next.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "admin" });

  return {
    title: t("dashboardTitle"),
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function AdminLayout({ children }: { readonly children: ReactNode }) {
  const locale = await getAdminLocale();
  const targetLocale = locale === "ar" ? "en" : "ar";
  const [tCommon, tLocales, tNav] = await Promise.all([
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "locales" }),
    getTranslations({ locale, namespace: "nav" }),
  ]);
  const targetLocaleLabel = tLocales(targetLocale);
  const controls = (
    <AdminControls
      cookieName={LOCALE_COOKIE_NAME}
      targetLocale={targetLocale}
      targetLocaleLabel={targetLocaleLabel}
      switchLocaleLabel={tCommon("switchLanguageTo", { language: targetLocaleLabel })}
      toDarkLabel={tNav("toDarkMode")}
      toLightLabel={tNav("toLightMode")}
    />
  );

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
        <AdminShell
          controls={controls}
          siteName={tCommon("siteName")}
          dashboardLabel={tNav("adminDashboard")}
        >
          {children}
        </AdminShell>
      </body>
    </html>
  );
}
