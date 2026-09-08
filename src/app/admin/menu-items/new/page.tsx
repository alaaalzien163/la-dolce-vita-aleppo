import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { createMenuItem } from "@/app/admin/menu-items/actions";
import { getMenuItemFormLabels } from "@/app/admin/menu-items/form-labels";
import { MenuItemForm } from "@/app/admin/menu-items/item-form";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminItemCategoryGroups } from "@/lib/data/admin/menu-items";

/** Create a menu item. Guarded before render; the action re-checks independently. */
export const dynamic = "force-dynamic";

export default async function NewMenuItemPage() {
  await requireAdmin();

  const locale = await getAdminLocale();
  const [t, groupsResult] = await Promise.all([
    getTranslations({ locale, namespace: "adminMenuItems" }),
    listAdminItemCategoryGroups(),
  ]);

  const groups = groupsResult.status === "success" ? groupsResult.data : [];
  // Labels depend on the groups, so this is sequential by necessity rather than by oversight.
  const { labels } = await getMenuItemFormLabels(groups);

  return (
    <main className="py-section">
      <Container>
        <nav aria-label={t("backToItems")} className="mb-8">
          <Link
            href="/admin/menu-items"
            className="text-sm underline decoration-accent-line decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:text-accent-ink"
          >
            {t("backToItems")}
          </Link>
        </nav>

        <h1 className="text-display-sm font-medium">{t("newItem")}</h1>

        <div className="mt-10">
          {groupsResult.status === "error" ? (
            <SectionNotice
              tone="error"
              title={t("errorTitle")}
              description={t("errorDescription")}
              headingLevel={3}
            />
          ) : groups.length === 0 ? (
            <SectionNotice
              title={t("noCategoriesTitle")}
              description={t("noCategoriesDescription")}
              headingLevel={3}
            />
          ) : (
            <MenuItemForm
              action={createMenuItem}
              labels={labels}
              groups={groups}
              cancelHref="/admin/menu-items"
            />
          )}
        </div>
      </Container>
    </main>
  );
}
