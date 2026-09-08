import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { toggleVenueActive } from "@/app/admin/venues/actions";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionNotice } from "@/components/ui/section-notice";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminVenues, listAdminVenueSections } from "@/lib/data/admin/venues";

/**
 * Venues management list.
 *
 * A Server Component with no client JavaScript at all. Status toggling is a `<form>`
 * posting to a Server Action, and edit and delete are links, so the whole screen is HTML
 * the browser already knows how to operate - keyboard, screen reader, and no-JS included.
 *
 * `requireAdmin()` runs before any markup, so there is no branch where this renders for a
 * visitor who is not a verified admin.
 *
 * Two layouts, one source of truth. Below `lg` each venue is a labelled card; from `lg` up
 * it is a real `<table>` inside a contained horizontal scroller. Exactly one layout is ever
 * in the accessibility tree.
 *
 * The section each venue belongs to is resolved from a map built from the same query that
 * backs the form's selector - there is no join magic to go wrong here, just id to name.
 *
 * `id`, `created_at`, and `updated_at` are deliberately not shown - none of them helps
 * anyone manage content.
 */

export const dynamic = "force-dynamic";

interface VenuesPageProps {
  readonly searchParams: Promise<{ readonly error?: string | string[] }>;
}

export default async function AdminVenuesPage({ searchParams }: VenuesPageProps) {
  await requireAdmin();

  const [locale, params, venuesResult, sectionsResult] = await Promise.all([
    getAdminLocale(),
    searchParams,
    listAdminVenues(),
    listAdminVenueSections(),
  ]);

  const t = await getTranslations({ locale, namespace: "adminVenues" });

  // Validated against a known key rather than rendered, so the query string cannot print
  // arbitrary text on an authenticated page.
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error;
  const deleteError =
    rawError === "deleteInUse"
      ? t("deleteInUse")
      : rawError === "deleteFailed"
        ? t("deleteFailed")
        : null;

  const venues = venuesResult.status === "success" ? venuesResult.data : [];

  const sectionNames = new Map<string, string>();
  if (sectionsResult.status === "success") {
    for (const section of sectionsResult.data) {
      sectionNames.set(section.id, section.name);
    }
  }

  // HTML escaping is not needed: these are option values already held by the database,
  // and React escapes anything it renders as text.
  const sectionNameOf = (sectionId: string): string =>
    sectionNames.get(sectionId) ?? t("unknownSection");

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
          <Link href="/admin/venues/new" className={buttonStyles()}>
            {t("newVenue")}
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
          {venuesResult.status === "error" ? (
            <SectionNotice
              tone="error"
              title={t("errorTitle")}
              description={t("errorDescription")}
              headingLevel={3}
            />
          ) : venues.length === 0 ? (
            <SectionNotice
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              headingLevel={3}
            />
          ) : (
            <>
              {/* Compact layout: one labelled card per venue. */}
              <ul className="flex flex-col gap-4 lg:hidden">
                {venues.map((venue) => (
                  <li key={venue.id} className="rounded-card border border-border bg-surface p-5">
                    <dl className="divide-y divide-border text-sm">
                      <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 pb-3">
                        <dt className="text-foreground-muted">{t("colName")}</dt>
                        <dd lang="ar" dir="rtl" className="font-medium">
                          {venue.name}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                        <dt className="text-foreground-muted">{t("colSection")}</dt>
                        <dd lang="ar" dir="rtl" className="text-foreground-muted">
                          {sectionNameOf(venue.section_id)}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                        <dt className="text-foreground-muted">{t("colSlug")}</dt>
                        <dd dir="ltr" className="truncate text-foreground-muted">
                          {venue.slug}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                        <dt className="text-foreground-muted">{t("colDescription")}</dt>
                        <dd lang="ar" dir="rtl" className="text-foreground-muted">
                          {venue.description ?? t("noDescription")}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                        <dt className="text-foreground-muted">{t("colOrder")}</dt>
                        <dd dir="ltr" className="font-medium">
                          {venue.display_order}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 py-3">
                        <dt className="text-foreground-muted">{t("colStatus")}</dt>
                        <dd className="font-medium">
                          {venue.is_active ? t("statusActive") : t("statusInactive")}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-4 pt-3">
                        <dt className="text-foreground-muted">{t("colActions")}</dt>
                        <dd className="flex flex-wrap items-center gap-2">
                          <VenueRowActions
                            id={venue.id}
                            isActive={venue.is_active}
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
                        {t("colName")}
                      </th>
                      <th scope="col" className="py-3 pe-4 text-start font-semibold">
                        {t("colSection")}
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
                    {venues.map((venue) => (
                      <tr key={venue.id} className="border-b border-border align-top">
                        <td lang="ar" dir="rtl" className="py-4 pe-4 font-medium">
                          {venue.name}
                        </td>
                        <td lang="ar" dir="rtl" className="py-4 pe-4 text-foreground-muted">
                          {sectionNameOf(venue.section_id)}
                        </td>
                        <td dir="ltr" className="py-4 pe-4 text-foreground-muted">
                          {venue.slug}
                        </td>
                        <td
                          lang="ar"
                          dir="rtl"
                          className="max-w-80 py-4 pe-4 text-foreground-muted"
                        >
                          {venue.description ?? t("noDescription")}
                        </td>
                        <td dir="ltr" className="py-4 pe-4">
                          {venue.display_order}
                        </td>
                        <td className="py-4 pe-4">
                          {venue.is_active ? t("statusActive") : t("statusInactive")}
                        </td>
                        <td className="py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <VenueRowActions
                              id={venue.id}
                              isActive={venue.is_active}
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
function VenueRowActions({
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
        href={`/admin/venues/${id}/edit`}
        className={buttonStyles({ variant: "outline", size: "sm" })}
      >
        {labels.edit}
      </Link>

      <form action={toggleVenueActive}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className={buttonStyles({ variant: "ghost", size: "sm" })}>
          {isActive ? labels.deactivate : labels.activate}
        </button>
      </form>

      <Link
        href={`/admin/venues/${id}/delete`}
        className={buttonStyles({ variant: "ghost", size: "sm" })}
      >
        {labels.delete}
      </Link>
    </>
  );
}
