import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { updateMenuMainCategory } from "@/app/admin/menu-main-categories/actions";
import { getMenuMainCategoryFormLabels } from "@/app/admin/menu-main-categories/form-labels";
import { MenuMainCategoryForm } from "@/app/admin/menu-main-categories/main-category-form";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import {
  getAdminMenuMainCategory,
  listAdminMainCategoryMenus,
} from "@/lib/data/admin/menu-main-categories";

/**
 * Edit a main category.
 *
 * A missing row renders a notice rather than calling `notFound()`, because reaching this
 * URL after deleting the category from another tab is ordinary, not exceptional - and the
 * admin's own not-found page would drop them out of the dashboard shell.
 */
export const dynamic = "force-dynamic";

interface EditMainCategoryPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function EditMenuMainCategoryPage({ params }: EditMainCategoryPageProps) {
  await requireAdmin();

  const [{ id }, locale] = await Promise.all([params, getAdminLocale()]);
  const [t, { labels }, categoryResult, menusResult] = await Promise.all([
    getTranslations({ locale, namespace: "adminMenuMainCategories" }),
    getMenuMainCategoryFormLabels(),
    getAdminMenuMainCategory(id),
    listAdminMainCategoryMenus(),
  ]);

  const menus = menusResult.status === "success" ? menusResult.data : [];

  return (
    <main className="py-section">
      <Container>
        <nav aria-label={t("backToMainCategories")} className="mb-8">
          <Link
            href="/admin/menu-main-categories"
            className="text-sm underline decoration-accent-line decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:text-accent-ink"
          >
            {t("backToMainCategories")}
          </Link>
        </nav>

        <h1 className="text-display-sm font-medium">{t("editMainCategory")}</h1>

        <div className="mt-10">
          {categoryResult.status === "success" && menusResult.status === "success" ? (
            <MenuMainCategoryForm
              action={updateMenuMainCategory}
              labels={labels}
              menus={menus}
              cancelHref="/admin/menu-main-categories"
              mainCategory={categoryResult.data}
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
              {menusResult.status === "error" || menus.length === 0 ? (
                <div className="mt-4">
                  <SectionNotice
                    title={t("noMenusTitle")}
                    description={t("noMenusDescription")}
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
