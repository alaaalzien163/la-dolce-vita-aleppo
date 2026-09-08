import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { createMenuCategory } from "@/app/admin/menu-categories/actions";
import { MenuCategoryForm } from "@/app/admin/menu-categories/category-form";
import { getMenuCategoryFormLabels } from "@/app/admin/menu-categories/form-labels";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminCategoryParentGroups } from "@/lib/data/admin/menu-categories";

/** Create a category. Guarded before render; the action re-checks independently. */
export const dynamic = "force-dynamic";

export default async function NewMenuCategoryPage() {
  await requireAdmin();

  const locale = await getAdminLocale();
  const [t, { labels }, parentsResult] = await Promise.all([
    getTranslations({ locale, namespace: "adminMenuCategories" }),
    getMenuCategoryFormLabels(),
    listAdminCategoryParentGroups(),
  ]);

  const parentGroups = parentsResult.status === "success" ? parentsResult.data : [];

  return (
    <main className="py-section">
      <Container>
        <nav aria-label={t("backToCategories")} className="mb-8">
          <Link
            href="/admin/menu-categories"
            className="text-sm underline decoration-accent-line decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:text-accent-ink"
          >
            {t("backToCategories")}
          </Link>
        </nav>

        <h1 className="text-display-sm font-medium">{t("newCategory")}</h1>

        <div className="mt-10">
          {parentsResult.status === "error" ? (
            <SectionNotice
              tone="error"
              title={t("errorTitle")}
              description={t("errorDescription")}
              headingLevel={3}
            />
          ) : parentGroups.length === 0 ? (
            <SectionNotice
              title={t("noMainCategoriesTitle")}
              description={t("noMainCategoriesDescription")}
              headingLevel={3}
            />
          ) : (
            <MenuCategoryForm
              action={createMenuCategory}
              labels={labels}
              parentGroups={parentGroups}
              cancelHref="/admin/menu-categories"
            />
          )}
        </div>
      </Container>
    </main>
  );
}
