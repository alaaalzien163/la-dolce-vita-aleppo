import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { toggleSectionActive } from "@/app/admin/sections/actions";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminSections } from "@/lib/data/admin/sections";

/**
 * Sections management list.
 *
 * A Server Component with no client JavaScript at all. Status toggling is a `<form>`
 * posting to a Server Action, and edit and delete are links, so the whole screen is HTML
 * the browser already knows how to operate - keyboard, screen reader, and no-JS included.
 *
 * `requireAdmin()` runs before any markup, so there is no branch where this renders for a
 * visitor who is not a verified admin.
 *
 * Two layouts, one source of truth. Below `lg` each section is a labelled card; from `lg`
 * up it is a real `<table>` inside a contained horizontal scroller. Exactly one layout is
 * ever in the accessibility tree.
 *
 * `id`, `created_at`, and `updated_at` are deliberately not shown - none of them helps
 * anyone manage content.
 */

export const dynamic = "force-dynamic";

interface SectionsPageProps {
  readonly searchParams: Promise<{ readonly error?: string | string[] }>;
}

export default async function AdminSectionsPage({ searchParams }: SectionsPageProps) {
  await requireAdmin();

  const [locale, params, result] = await Promise.all([
    getAdminLocale(),
    searchParams,
    listAdminSections(),
  ]);

  const t = await getTranslations({ locale, namespace: "adminSections" });

  // Validated against a known key rather than rendered, so the query string cannot print
  // arbitrary text on an authenticated page.
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error;
  const deleteError = rawError === "deleteFailed" ? t("deleteFailed") : null;

  const sections = result.status === "success" ? result.data : [];

  return (
    <main className="py-section">
      <Container>
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
          <Link href="/admin/sections/new" className={buttonStyles()}>
            {t("newSection")}
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
          {result.status === "error" ? (
            <SectionNotice
              tone="error"
              title={t("errorTitle")}
              description={t("errorDescription")}
              headingLevel={3}
            />
          ) : sections.length === 0 ? (
            <SectionNotice
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              headingLevel={3}
            />
          ) : (
            <>
              {/* Compact layout: one labelled card per section. */}
              <ul className="flex flex-col gap-4 lg:hidden">
                {sections.map((section) => (
                  <li key={section.id} className="rounded-card border border-border bg-surface p-5">
                    <dl className="divide-y divide-border text-sm">
                      <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 pb-3">
                        <dt className="text-foreground-muted">{t("colImage")}</dt>
                        <dd>
                          {section.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={section.image_url}
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
                          {section.name}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                        <dt className="text-foreground-muted">{t("colSlug")}</dt>
                        <dd dir="ltr" className="truncate text-foreground-muted">
                          {section.slug}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                        <dt className="text-foreground-muted">{t("colDescription")}</dt>
                        <dd lang="ar" dir="rtl" className="text-foreground-muted">
                          {section.description ?? t("noDescription")}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                        <dt className="text-foreground-muted">{t("colOrder")}</dt>
                        <dd dir="ltr" className="font-medium">
                          {section.display_order}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                        <dt className="text-foreground-muted">{t("colStatus")}</dt>
                        <dd className="font-medium">
                          {section.is_active ? t("statusActive") : t("statusInactive")}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 pt-3">
                        <dt className="text-foreground-muted">{t("colActions")}</dt>
                        <dd className="flex flex-wrap items-center gap-2">
                          <SectionRowActions
                            id={section.id}
                            isActive={section.is_active}
                            labels={{
                              edit: t("edit"),
                              delete: t("delete"),
                              activate: t("activate"),
                              deactivate: t("deactivate"),
                            }}
                          />
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>

              {/* Large screens: a semantic table with contained horizontal overflow. */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[64rem] border-collapse text-sm">
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
                        {t("colSlug")}
                      </th>
                      <th scope="col" className="py-3 pe-4 text-start font-semibold">
                        {t("colDescription")}
                      </th>
                      <th scope="col" className="py-3 pe-4 text-start font-semibold">
                        {t("colOrder")}
                      </th>
                      <th scope="col" className="py-3 pe-4 text-start font-semibold">
                        {t("colStatus")}
                      </th>
                      <th scope="col" className="py-3 text-start font-semibold">
                        {t("colActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((section) => (
                      <tr key={section.id} className="border-b border-border align-top">
                        <td className="py-4 pe-4">
                          {section.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={section.image_url}
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
                          {section.name}
                        </td>
                        <td dir="ltr" className="py-4 pe-4 text-foreground-muted">
                          {section.slug}
                        </td>
                        <td
                          lang="ar"
                          dir="rtl"
                          className="max-w-80 py-4 pe-4 text-foreground-muted"
                        >
                          {section.description ?? t("noDescription")}
                        </td>
                        <td dir="ltr" className="py-4 pe-4">
                          {section.display_order}
                        </td>
                        <td className="py-4 pe-4">
                          {section.is_active ? t("statusActive") : t("statusInactive")}
                        </td>
                        <td className="py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <SectionRowActions
                              id={section.id}
                              isActive={section.is_active}
                              labels={{
                                edit: t("edit"),
                                delete: t("delete"),
                                activate: t("activate"),
                                deactivate: t("deactivate"),
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
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
 * Edit link, status toggle, and delete link for one row.
 *
 * The toggle is a submit button inside its own `<form>` - a state change belongs behind a
 * POST, not a link a crawler or a prefetch could follow. Delete is a link to a
 * confirmation page rather than a form, so nothing destructive happens on one click.
 */
function SectionRowActions({
  id,
  isActive,
  labels,
}: {
  readonly id: string;
  readonly isActive: boolean;
  readonly labels: {
    readonly edit: string;
    readonly delete: string;
    readonly activate: string;
    readonly deactivate: string;
  };
}) {
  return (
    <>
      <Link
        href={`/admin/sections/${id}/edit`}
        className={buttonStyles({ variant: "outline", size: "sm" })}
      >
        {labels.edit}
      </Link>

      <form action={toggleSectionActive}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className={buttonStyles({ variant: "ghost", size: "sm" })}>
          {isActive ? labels.deactivate : labels.activate}
        </button>
      </form>

      <Link
        href={`/admin/sections/${id}/delete`}
        className={buttonStyles({ variant: "ghost", size: "sm" })}
      >
        {labels.delete}
      </Link>
    </>
  );
}
