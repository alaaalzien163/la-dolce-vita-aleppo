import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { updateMenuCategory } from "@/app/admin/menu-categories/actions";
import { MenuCategoryForm } from "@/app/admin/menu-categories/category-form";
import { getMenuCategoryFormLabels } from "@/app/admin/menu-categories/form-labels";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import {
  getAdminMenuCategory,
  listAdminCategoryParentGroups,
} from "@/lib/data/admin/menu-categories";

/**
 * Edit a category.
 *
 * A missing row renders a notice rather than calling `notFound()`, because reaching this URL
 * after deleting the category from another tab is ordinary, not exceptional - and the admin's
 * own not-found page would drop them out of the dashboard shell.
 */
export const dynamic = "force-dynamic";

interface EditMenuCategoryPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function EditMenuCategoryPage({ params }: EditMenuCategoryPageProps) {
  await requireAdmin();

  const [{ id }, locale] = await Promise.all([params, getAdminLocale()]);
  const [t, { labels }, categoryResult, parentsResult] = await Promise.all([
    getTranslations({ locale, namespace: "adminMenuCategories" }),
    getMenuCategoryFormLabels(),
    getAdminMenuCategory(id),
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

        <h1 className="text-display-sm font-medium">{t("editCategory")}</h1>

        <div className="mt-10">
          {categoryResult.status === "success" && parentsResult.status === "success" ? (
            <MenuCategoryForm
              action={updateMenuCategory}
              labels={labels}
              parentGroups={parentGroups}
              cancelHref="/admin/menu-categories"
              category={categoryResult.data}
            />
          ) : (
            <>
              {categoryResult.status === "empty" ? (
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
              {parentsResult.status !== "success" ? (
                <div className="mt-4">
                  <SectionNotice
                    title={t("noMainCategoriesTitle")}
                    description={t("noMainCategoriesDescription")}
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
