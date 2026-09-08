import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { signOutAdmin } from "@/app/admin/actions";
import { Logo } from "@/components/brand/logo";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * Dashboard shell.
 *
 * `requireAdmin()` is the first thing that runs, before any markup is produced. It
 * redirects on failure, so there is no path where the shell renders for a visitor who
 * is not a verified admin - the guard is not a conditional wrapped around the JSX.
 *
 * The proxy has already confirmed a session exists by this point. Repeating the check
 * here is intentional: the proxy performs no role lookup, and a page that trusted the
 * network layer for authorization would be one misconfigured matcher away from being
 * open. This also means a role revoked mid-session takes effect on the next request
 * rather than whenever the token happens to expire.
 *
 * Only `profiles` is queried, once, for the caller's own row. No table is touched to
 * populate the module list - that list is static now that every module is built.
 *
 * SHELL ONLY. No create, read, update, or delete happens here. Every module below is
 * a link; the ternary that renders inert placeholders remains only for the next
 * module that arrives before its route does.
 */

export const dynamic = "force-dynamic";

interface AdminModule {
  readonly key: string;
  readonly label: string;
  /** Set once the module is built. Placeholders stay inert. */
  readonly href?: string;
}

export default async function AdminDashboardPage() {
  const [identity, locale] = await Promise.all([requireAdmin(), getAdminLocale()]);
  const [t, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "admin" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  const modules: readonly AdminModule[] = [
    { key: "sections", label: t("moduleSections"), href: "/admin/sections" },
    { key: "venues", label: t("moduleVenues"), href: "/admin/venues" },
    { key: "menus", label: t("moduleMenus"), href: "/admin/menus" },
    {
      key: "mainCategories",
      label: t("moduleMainCategories"),
      href: "/admin/menu-main-categories",
    },
    { key: "categories", label: t("moduleCategories"), href: "/admin/menu-categories" },
    { key: "menuItems", label: t("moduleMenuItems"), href: "/admin/menu-items" },
    { key: "siteSettings", label: t("moduleSiteSettings"), href: "/admin/settings" },
    { key: "profile", label: t("moduleProfile"), href: "/admin/profile" },
  ];

  return (
    <>
      <header className="border-b border-border bg-surface">
        <Container className="flex h-16 items-center gap-4 pe-36 sm:h-20">
          <Logo label={tCommon("siteName")} size="sm" priority />

          <div className="ms-auto flex items-center gap-4">
            <p className="hidden text-sm text-foreground-muted sm:block">
              <span className="me-1">{t("signedInAs")}</span>
              {/* An email address is Latin and order-significant, so it does not
                  mirror even when the surrounding label does. */}
              <span dir="ltr" className="font-semibold text-foreground">
                {identity.email ?? identity.id}
              </span>
            </p>

            {/*
              A form posting to a Server Action, not an onClick handler. Sign-out has to
              clear httpOnly session cookies, which only the server can do, and this way
              the button needs no client JavaScript at all.
            */}
            <form action={signOutAdmin}>
              <button type="submit" className={buttonStyles({ variant: "outline", size: "sm" })}>
                {t("signOut")}
              </button>
            </form>
          </div>
        </Container>
      </header>

      <main className="py-section">
        <Container>
          <h1 className="text-display-md font-medium">{t("dashboardTitle")}</h1>

          <p className="mt-4 text-sm text-foreground-muted sm:hidden">
            <span className="me-1">{t("signedInAs")}</span>
            <span dir="ltr" className="font-semibold text-foreground">
              {identity.email ?? identity.id}
            </span>
          </p>

          <section aria-labelledby="admin-modules-heading" className="mt-12">
            <h2 id="admin-modules-heading" className="text-display-sm font-medium">
              {t("modulesHeading")}
            </h2>
            <p className="mt-3 max-w-measure text-sm text-foreground-muted">
              {t("modulesDescription")}
            </p>

            <ul
              aria-label={t("modulesLabel")}
              className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {modules.map((module) => (
                <li key={module.key}>
                  {module.href ? (
                    // Built modules are links; the rest stay inert. A link to a route that
                    // does not exist is worse than an obvious placeholder.
                    <Link
                      href={module.href}
                      className="block h-full rounded-card border border-border bg-surface px-5 py-6 transition-[border-color,box-shadow] duration-200 ease-out hover:border-accent-line hover:shadow-raised"
                    >
                      <p className="font-medium">{module.label}</p>
                      <p className="mt-1 text-eyebrow font-semibold tracking-eyebrow text-accent-ink uppercase">
                        {t("moduleOpen")}
                      </p>
                    </Link>
                  ) : (
                    <div className="h-full rounded-card border border-dashed border-border-strong/45 bg-surface px-5 py-6">
                      <p className="font-medium">{module.label}</p>
                      <p className="mt-1 text-eyebrow font-semibold tracking-eyebrow text-foreground-muted uppercase">
                        {t("comingSoon")}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </Container>
      </main>
    </>
  );
}
