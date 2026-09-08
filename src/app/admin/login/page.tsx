import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/app/admin/login/login-form";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { getAdminLocale } from "@/i18n/admin-locale";
import { LOGIN_NOTICE } from "@/lib/auth/admin";

/**
 * Admin sign-in page.
 *
 * A Server Component that resolves the locale and translations, then hands plain
 * strings to the form. The only client JavaScript is the form itself.
 *
 * The `notice` query parameter carries why the visitor arrived here, and it is
 * validated against a known set rather than rendered: an unrecognised value produces
 * no message at all. Echoing `searchParams` into the page would be a reflected
 * injection vector, and a parameter that can print arbitrary text on a login screen is
 * a convenient way to make a phishing page look official.
 *
 * Nothing distinguishes a rejected password from a rejected role. Both paths land on
 * the same generic wording, so this page cannot be used to enumerate accounts.
 */

export const dynamic = "force-dynamic";

/**
 * Overrides the layout's title, which names the dashboard. A sign-in page that calls
 * itself "Dashboard" in the tab and in browser history is misleading, and it also
 * hints at what lies behind it.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "admin" });

  return {
    title: t("loginTitle"),
    robots: { index: false, follow: false, nocache: true },
  };
}

interface LoginPageProps {
  readonly searchParams: Promise<{ readonly notice?: string | string[] }>;
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const [locale, params] = await Promise.all([getAdminLocale(), searchParams]);
  const t = await getTranslations({ locale, namespace: "admin" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const raw = Array.isArray(params.notice) ? params.notice[0] : params.notice;
  const notice =
    raw === LOGIN_NOTICE.denied
      ? t("notAuthorized")
      : raw === LOGIN_NOTICE.signedOut
        ? t("signedOut")
        : raw === LOGIN_NOTICE.passwordChanged
          ? t("passwordChanged")
          : null;

  return (
    <main className="flex min-h-dvh flex-col justify-center py-section">
      <Container width="measure">
        <div className="mx-auto w-full max-w-100">
          <div className="flex flex-col items-center gap-8 text-center">
            <Logo label={tCommon("siteName")} size="lg" priority />
            <div>
              <h1 className="text-display-sm font-medium">{t("loginTitle")}</h1>
              <p className="mt-3 text-sm text-foreground-muted">{t("loginDescription")}</p>
            </div>
          </div>

          {notice ? (
            // Server-rendered on arrival, so it is part of the initial document rather
            // than something the form has to be told about.
            <p
              role="status"
              className="mt-8 rounded-control border border-border-strong/50 bg-surface-muted px-4 py-3 text-sm text-foreground"
            >
              {notice}
            </p>
          ) : null}

          <div className="mt-8">
            <LoginForm
              labels={{
                email: t("emailLabel"),
                password: t("passwordLabel"),
                submit: t("submit"),
                submitting: t("submitting"),
                invalidCredentials: t("invalidCredentials"),
                notAuthorized: t("notAuthorized"),
                unexpectedError: t("unexpectedError"),
              }}
            />
          </div>

          <p className="mt-10 text-center text-sm">
            {/* Plain anchor: this leaves the unprefixed admin area for a locale-prefixed
                public route, so next-intl's Link has nothing to contribute. */}
            <a
              href={`/${locale}`}
              className="underline decoration-accent-line decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:text-accent-ink"
            >
              {t("backToSite")}
            </a>
          </p>
        </div>
      </Container>
    </main>
  );
}
