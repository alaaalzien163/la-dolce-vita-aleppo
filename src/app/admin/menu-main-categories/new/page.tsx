import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { createMenuMainCategory } from "@/app/admin/menu-main-categories/actions";
import { getMenuMainCategoryFormLabels } from "@/app/admin/menu-main-categories/form-labels";
import { MenuMainCategoryForm } from "@/app/admin/menu-main-categories/main-category-form";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminMainCategoryMenus } from "@/lib/data/admin/menu-main-categories";

/** Create a main category. Guarded before render; the action re-checks independently. */
export const dynamic = "force-dynamic";

export default async function NewMenuMainCategoryPage() {
  await requireAdmin();

  const locale = await getAdminLocale();
  const [t, { labels }, menusResult] = await Promise.all([
    getTranslations({ locale, namespace: "adminMenuMainCategories" }),
    getMenuMainCategoryFormLabels(),
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

        <h1 className="text-display-sm font-medium">{t("newMainCategory")}</h1>

        <div className="mt-10">
          {menusResult.status === "error" ? (
            <SectionNotice
              tone="error"
              title={t("errorTitle")}
              description={t("errorDescription")}
              headingLevel={3}
            />
          ) : menus.length === 0 ? (
            <SectionNotice
              title={t("noMenusTitle")}
              description={t("noMenusDescription")}
              headingLevel={3}
            />
          ) : (
            <MenuMainCategoryForm
              action={createMenuMainCategory}
              labels={labels}
              menus={menus}
              cancelHref="/admin/menu-main-categories"
            />
          )}
        </div>
      </Container>
    </main>
  );
}
