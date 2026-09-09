import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { toggleMenuItemAvailable } from "@/app/admin/menu-items/actions";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import {
  buildItemCategoryLabelLookup,
  listAdminItemCategoryGroups,
  listAdminMenuItems,
} from "@/lib/data/admin/menu-items";

/**
 * Menu items management list.
 *
 * A Server Component with no client JavaScript at all. Availability toggling is a `<form>`
 * posting to a Server Action, and edit and delete are links, so the whole screen is HTML the
 * browser already knows how to operate - keyboard, screen reader, and no-JS included.
 *
 * `requireAdmin()` runs before any markup, so there is no branch where this renders for a visitor
 * who is not a verified admin.
 *
 * Two layouts, one source of truth. Below `lg` each item is a labelled card; from `lg` up it is
 * a real `<table>` inside a contained horizontal scroller. Exactly one layout is ever in the
 * accessibility tree.
 *
 * PRICE IS RENDERED AS STORED, NOT FORMATTED. `Intl.NumberFormat` with `style: "currency"` throws
 * on a currency code it does not recognise, and this column's permitted values are not knowable
 * from the schema - a menu screen must not be able to crash on a currency string. The number and
 * code are printed as stored in separate fields.
 *
 * `id`, `created_at`, and `updated_at` are deliberately not shown - none of them helps anyone
 * manage content.
 */

export const dynamic = "force-dynamic";

interface MenuItemsPageProps {
  readonly searchParams: Promise<{ readonly error?: string | string[] }>;
}

export default async function AdminMenuItemsPage({ searchParams }: MenuItemsPageProps) {
  await requireAdmin();

  const [locale, params, itemsResult, groupsResult] = await Promise.all([
    getAdminLocale(),
    searchParams,
    listAdminMenuItems(),
    listAdminItemCategoryGroups(),
  ]);

  const t = await getTranslations({ locale, namespace: "adminMenuItems" });

  // Validated against a known key rather than rendered, so the query string cannot print
  // arbitrary text on an authenticated page.
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error;
  const deleteError =
    rawError === "deleteInUse"
      ? t("deleteInUse")
      : rawError === "deleteFailed"
        ? t("deleteFailed")
        : null;

  const items = itemsResult.status === "success" ? itemsResult.data : [];
  const categoryLookup = buildItemCategoryLabelLookup(
    groupsResult.status === "success" ? groupsResult.data : [],
  );

  const ancestryOf = (categoryId: string) => {
    const found = categoryLookup.get(categoryId);
    return {
      categoryName: found?.categoryName ?? t("unknownCategory"),
      mainCategoryName: found?.mainCategoryName ?? t("unknownMainCategory"),
      menuName: found?.menuName ?? t("unknownMenu"),
    };
  };

  return (
    <main className="py-section">
      <Container width="wide">
        <nav aria-label={t("backToDashboard")} className="mb-8">
          <Link
            href="/admin"
            className="text-sm underline decoration-accent-line decoration-1 underline-offset-4 transition-colors duration-150 ease-out hover:text-accent-ink"
          >
            {t("backToDashboard")}
          </Link>
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-display-sm font-medium">{t("title")}</h1>
            <p className="mt-3 max-w-measure text-sm text-foreground-muted">{t("description")}</p>
          </div>
          <Link href="/admin/menu-items/new" className={buttonStyles()}>
            {t("newItem")}
          </Link>
        </div>

        {deleteError ? (
          <p
            role="alert"
            className="mt-8 rounded-control border border-error/45 bg-error/5 px-4 py-3 text-sm"
          >
            {deleteError}
          </p>
        ) : null}

        <div className="mt-10">
          {itemsResult.status === "error" ? (
            <SectionNotice
              tone="error"
              title={t("errorTitle")}
              description={t("errorDescription")}
              headingLevel={3}
            />
          ) : items.length === 0 ? (
            <SectionNotice
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              headingLevel={3}
            />
          ) : (
            <>
              {/* Compact layout: one labelled card per item. */}
              <ul className="flex flex-col gap-4 lg:hidden">
                {items.map((item) => {
                  const ancestry = ancestryOf(item.category_id);

                  return (
                    <li key={item.id} className="rounded-card border border-border bg-surface p-5">
                      <dl className="divide-y divide-border text-sm">
                        <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 pb-3">
                          <dt className="text-foreground-muted">{t("colImage")}</dt>
                          <dd>
                            {item.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.image_url}
                                alt=""
                                className="size-16 rounded-control border border-border object-cover"
                              />
                            ) : (
                              <span className="flex size-16 items-center justify-center rounded-control border border-dashed border-border-strong/45 text-eyebrow text-foreground-muted uppercase">
                                {t("noImage")}
                              </span>
                            )}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                          <dt className="text-foreground-muted">{t("colName")}</dt>
                          <dd lang="ar" dir="rtl" className="font-medium">
                            {item.name}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                          <dt className="text-foreground-muted">{t("colDescription")}</dt>
                          <dd lang="ar" dir="rtl" className="text-foreground-muted">
                            {item.description ?? t("noDescription")}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                          <dt className="text-foreground-muted">{t("colCategory")}</dt>
                          <dd lang="ar" dir="rtl" className="text-foreground-muted">
                            {ancestry.categoryName}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                          <dt className="text-foreground-muted">{t("colMainCategory")}</dt>
                          <dd lang="ar" dir="rtl" className="text-foreground-muted">
                            {ancestry.mainCategoryName}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                          <dt className="text-foreground-muted">{t("colMenu")}</dt>
                          <dd lang="ar" dir="rtl" className="text-foreground-muted">
                            {ancestry.menuName}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                          <dt className="text-foreground-muted">{t("colPrice")}</dt>
                          <dd dir="ltr" className="font-medium">
                            {item.price ?? ""}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                          <dt className="text-foreground-muted">{t("colCurrency")}</dt>
                          <dd dir="ltr" className="font-medium">
                            {item.price === null ? "" : item.currency}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                          <dt className="text-foreground-muted">{t("colOrder")}</dt>
                          <dd dir="ltr" className="font-medium">
                            {item.display_order}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                          <dt className="text-foreground-muted">{t("colAvailability")}</dt>
                          <dd className="font-medium">
                            {item.is_available ? t("statusAvailable") : t("statusUnavailable")}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                          <dt className="text-foreground-muted">{t("colFeatured")}</dt>
                          <dd className="font-medium">
                            {item.is_featured ? t("statusFeatured") : "-"}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 pt-3">
                          <dt className="text-foreground-muted">{t("colActions")}</dt>
                          <dd className="flex flex-wrap items-center gap-2">
                            <MenuItemRowActions
                              id={item.id}
                              isAvailable={item.is_available}
                              labels={{
                                edit: t("edit"),
                                delete: t("delete"),
                                markAvailable: t("markAvailable"),
                                markUnavailable: t("markUnavailable"),
                              }}
                            />
                          </dd>
                        </div>
                      </dl>
                    </li>
                  );
                })}
              </ul>

              {/* Large screens: a semantic table with contained horizontal overflow. */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[96rem] border-collapse text-sm">
                  <caption className="sr-only">{t("title")}</caption>
                  <thead>
                    <tr className="border-b border-border-strong/40 text-start">
                      <th scope="col" className="py-3 pe-4 text-start font-semibold">
                        {t("colImage")}
                      </th>
                      <th scope="col" className="py-3 pe-4 text-start font-semibold">
                        {t("colName")}
                      </th>
                      <th scope="col" className="py-3 pe-4 text-start font-semibold">
                        {t("colDescription")}
                      </th>
                      <th scope="col" className="py-3 pe-4 text-start font-semibold">
                        {t("colCategory")}
                      </th>
                      <th scope="col" className="py-3 pe-4 text-start font-semibold">
                        {t("colMainCategory")}
                      </th>
                      <th scope="col" className="py-3 pe-4 text-start font-semibold">
                        {t("colMenu")}
                      </th>
                      <th scope="col" className="py-3 pe-4 text-start font-semibold">
                        {t("colPrice")}
                      </th>
                      <th scope="col" className="py-3 pe-4 text-start font-semibold">
                        {t("colCurrency")}
                      </th>
                      <th scope="col" className="py-3 pe-4 text-start font-semibold">
                        {t("colOrder")}
                      </th>
                      <th scope="col" className="py-3 pe-4 text-start font-semibold">
                        {t("colAvailability")}
                      </th>
                      <th scope="col" className="py-3 pe-4 text-start font-semibold">
                        {t("colFeatured")}
                      </th>
                      <th scope="col" className="py-3 text-start font-semibold">
                        {t("colActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const ancestry = ancestryOf(item.category_id);

                      return (
                        <tr key={item.id} className="border-b border-border align-top">
                          <td className="py-4 pe-4">
                            {item.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.image_url}
                                alt=""
                                className="size-14 rounded-control border border-border object-cover"
                              />
                            ) : (
                              <span className="flex size-14 items-center justify-center rounded-control border border-dashed border-border-strong/45 text-eyebrow text-foreground-muted uppercase">
                                {t("noImage")}
                              </span>
                            )}
                          </td>
                          <td lang="ar" dir="rtl" className="py-4 pe-4 font-medium">
                            {item.name}
                          </td>
                          <td
                            lang="ar"
                            dir="rtl"
                            className="max-w-80 py-4 pe-4 text-foreground-muted"
                          >
                            {item.description ?? t("noDescription")}
                          </td>
                          <td lang="ar" dir="rtl" className="py-4 pe-4 text-foreground-muted">
                            {ancestry.categoryName}
                          </td>
                          <td lang="ar" dir="rtl" className="py-4 pe-4 text-foreground-muted">
                            {ancestry.mainCategoryName}
                          </td>
                          <td lang="ar" dir="rtl" className="py-4 pe-4 text-foreground-muted">
                            {ancestry.menuName}
                          </td>
                          <td dir="ltr" className="py-4 pe-4 whitespace-nowrap">
                            {item.price ?? ""}
                          </td>
                          <td dir="ltr" className="py-4 pe-4 whitespace-nowrap">
                            {item.price === null ? "" : item.currency}
                          </td>
                          <td dir="ltr" className="py-4 pe-4">
                            {item.display_order}
                          </td>
                          <td className="py-4 pe-4">
                            {item.is_available ? t("statusAvailable") : t("statusUnavailable")}
                          </td>
                          <td className="py-4 pe-4">
                            {item.is_featured ? t("statusFeatured") : "-"}
                          </td>
                          <td className="py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <MenuItemRowActions
                                id={item.id}
                                isAvailable={item.is_available}
                                labels={{
                                  edit: t("edit"),
                                  delete: t("delete"),
                                  markAvailable: t("markAvailable"),
                                  markUnavailable: t("markUnavailable"),
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Container>
    </main>
  );
}

/**
 * Edit link, availability toggle, and delete link for one row.
 *
 * The toggle is a submit button inside its own `<form>` - a state change belongs behind a POST,
 * not a link a crawler or a prefetch could follow. Delete is a link to a confirmation page rather
 * than a form, so nothing destructive happens on one click.
 */
function MenuItemRowActions({
  id,
  isAvailable,
  labels,
}: {
  readonly id: string;
  readonly isAvailable: boolean;
  readonly labels: {
    readonly edit: string;
    readonly delete: string;
    readonly markAvailable: string;
    readonly markUnavailable: string;
  };
}) {
  return (
    <>
      <Link
        href={`/admin/menu-items/${id}/edit`}
        className={buttonStyles({ variant: "outline", size: "sm" })}
      >
        {labels.edit}
      </Link>

      <form action={toggleMenuItemAvailable}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className={buttonStyles({ variant: "ghost", size: "sm" })}>
          {isAvailable ? labels.markUnavailable : labels.markAvailable}
        </button>
      </form>

      <Link
        href={`/admin/menu-items/${id}/delete`}
        className={buttonStyles({ variant: "ghost", size: "sm" })}
      >
        {labels.delete}
      </Link>
    </>
  );
}
