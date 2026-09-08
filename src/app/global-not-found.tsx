import type { Metadata } from "next";

import { Container } from "@/components/ui/container";
import { getDirection } from "@/i18n/direction";
import { routing } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "404",
  robots: { index: false, follow: false },
};

/**
 * The site's 404 page.
 *
 * Requires `experimental.globalNotFound` in `next.config.ts`. It renders its own
 * `<html>`/`<body>` because it is resolved outside the `[locale]` segment, which
 * is precisely why it works: a `not-found.tsx` placed *inside* `[locale]` cannot
 * server-render a document shell in Next.js 16.3.4 - `notFound()` unwinds past
 * the layout that owns `<html>`, and the response degrades to Next.js' bare
 * internal error document with an empty body.
 *
 * Because it owns the document it must also apply `fontVariables` itself;
 * otherwise the page would render in fallback fonts.
 *
 * Copy is bilingual rather than translated: `next/root-params` is unavailable
 * here (the compiler only substitutes that module inside routes that actually
 * have the param), so the request's locale cannot be read. The document uses the
 * default locale's `lang`/`dir` and states the message in both languages, so an
 * English visitor is not left without a readable message.
 */
export default function GlobalNotFound() {
  const locale = routing.defaultLocale;

  return (
    <html
      lang={locale}
      dir={getDirection(locale)}
      data-scroll-behavior="smooth"
      className={fontVariables}
    >
      <body className="min-h-dvh antialiased">
        <main>
          <Container width="measure" className="py-section-lg">
            <p className="flex items-center gap-3 text-eyebrow font-semibold tracking-eyebrow text-accent-ink uppercase">
              <span aria-hidden="true" className="h-px w-8 bg-accent-line" />
              404
            </p>
            <h1 className="mt-5 text-display-md font-medium">
              الصفحة غير موجودة <span lang="en">/ Page not found</span>
            </h1>
            <p className="mt-5 text-lg text-foreground-muted">
              الرابط الذي طلبته غير متاح.{" "}
              <span lang="en">The page you requested is not available.</span>
            </p>
            <p className="mt-8">
              <a
                href={`/${locale}`}
                className="font-semibold text-foreground underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-foreground"
              >
                العودة إلى الصفحة الرئيسية <span lang="en">/ Back to home</span>
              </a>
            </p>
          </Container>
        </main>
      </body>
    </html>
  );
}
