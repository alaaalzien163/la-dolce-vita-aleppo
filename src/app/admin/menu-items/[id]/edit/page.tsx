import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { updateMenuItem } from "@/app/admin/menu-items/actions";
import { getMenuItemFormLabels } from "@/app/admin/menu-items/form-labels";
import { MenuItemForm } from "@/app/admin/menu-items/item-form";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminMenuItem, listAdminItemCategoryGroups } from "@/lib/data/admin/menu-items";

/**
 * Edit a menu item.
 *
 * A missing row renders a notice rather than calling `notFound()`, because reaching this URL after
 * deleting the item from another tab is ordinary, not exceptional - and the admin's own not-found
 * page would drop them out of the dashboard shell.
 */
export const dynamic = "force-dynamic";

interface EditMenuItemPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function EditMenuItemPage({ params }: EditMenuItemPageProps) {
  await requireAdmin();

  const [{ id }, locale] = await Promise.all([params, getAdminLocale()]);
  const [t, itemResult, groupsResult] = await Promise.all([
    getTranslations({ locale, namespace: "adminMenuItems" }),
    getAdminMenuItem(id),
    listAdminItemCategoryGroups(),
  ]);

  const groups = groupsResult.status === "success" ? groupsResult.data : [];
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

        <h1 className="text-display-sm font-medium">{t("editItem")}</h1>

        <div className="mt-10">
          {itemResult.status === "success" && groupsResult.status === "success" ? (
            <MenuItemForm
              action={updateMenuItem}
              labels={labels}
              groups={groups}
              cancelHref="/admin/menu-items"
              item={itemResult.data}
            />
          ) : (
            <>
              {itemResult.status === "empty" ? (
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
              {groupsResult.status !== "success" ? (
                <div className="mt-4">
                  <SectionNotice
                    title={t("noCategoriesTitle")}
                    description={t("noCategoriesDescription")}
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
