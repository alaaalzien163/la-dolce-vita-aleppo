import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { updateMenu } from "@/app/admin/menus/actions";
import { getMenuFormLabels } from "@/app/admin/menus/form-labels";
import { MenuForm } from "@/app/admin/menus/menu-form";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminMenu, listAdminMenuVenues } from "@/lib/data/admin/menus";

/**
 * Edit a menu.
 *
 * A missing row renders a notice rather than calling `notFound()`, because reaching this
 * URL after deleting the menu from another tab is ordinary, not exceptional - and the
 * admin's own not-found page would drop them out of the dashboard shell.
 */
export const dynamic = "force-dynamic";

interface EditMenuPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function EditMenuPage({ params }: EditMenuPageProps) {
  await requireAdmin();

  const [{ id }, locale] = await Promise.all([params, getAdminLocale()]);
  const [t, { labels }, menuResult, venuesResult] = await Promise.all([
    getTranslations({ locale, namespace: "adminMenus" }),
    getMenuFormLabels(),
    getAdminMenu(id),
    listAdminMenuVenues(),
  ]);

  const venues = venuesResult.status === "success" ? venuesResult.data : [];

  return (
    <main className="py-section">
      <Container>
        <nav aria-label={t("backToMenus")} className="mb-8">
          <Link
            href="/admin/menus"
            className="text-sm underline decoration-accent-line decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:text-accent-ink"
          >
            {t("backToMenus")}
          </Link>
        </nav>

        <h1 className="text-display-sm font-medium">{t("editMenu")}</h1>

        <div className="mt-10">
          {menuResult.status === "success" && venuesResult.status === "success" ? (
            <MenuForm
              action={updateMenu}
              labels={labels}
              venues={venues}
              cancelHref="/admin/menus"
              menu={menuResult.data}
            />
          ) : (
            <>
              {menuResult.status === "empty" ? (
                <SectionNotice
                  title={t("notFoundTitle")}
                  description={t("notFoundDescription")}
                  headingLevel={3}
                />
              ) : (
                <SectionNotice
                  tone="error"
                  title={t("errorTitle")}
                  description={t("errorDescription")}
                  headingLevel={3}
                />
              )}
              {venuesResult.status === "error" || venues.length === 0 ? (
                <div className="mt-4">
                  <SectionNotice
                    title={t("noVenuesTitle")}
                    description={t("noVenuesDescription")}
                    headingLevel={3}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </Container>
    </main>
  );
}
