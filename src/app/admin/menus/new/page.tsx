import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { createMenu } from "@/app/admin/menus/actions";
import { getMenuFormLabels } from "@/app/admin/menus/form-labels";
import { MenuForm } from "@/app/admin/menus/menu-form";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminMenuVenues } from "@/lib/data/admin/menus";

/** Create a menu. Guarded before render; the action re-checks independently. */
export const dynamic = "force-dynamic";

export default async function NewMenuPage() {
  await requireAdmin();

  const locale = await getAdminLocale();
  const [t, { labels }, venuesResult] = await Promise.all([
    getTranslations({ locale, namespace: "adminMenus" }),
    getMenuFormLabels(),
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

        <h1 className="text-display-sm font-medium">{t("newMenu")}</h1>

        <div className="mt-10">
          {venuesResult.status === "error" ? (
            <SectionNotice
              tone="error"
              title={t("errorTitle")}
              description={t("errorDescription")}
              headingLevel={3}
            />
          ) : venues.length === 0 ? (
            <SectionNotice
              title={t("noVenuesTitle")}
              description={t("noVenuesDescription")}
              headingLevel={3}
            />
          ) : (
            <MenuForm
              action={createMenu}
              labels={labels}
              venues={venues}
              cancelHref="/admin/menus"
            />
          )}
        </div>
      </Container>
    </main>
  );
}
