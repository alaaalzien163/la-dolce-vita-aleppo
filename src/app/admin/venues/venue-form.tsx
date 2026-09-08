"use client";

import Link from "next/link";
import { useActionState } from "react";

import { VENUE_FORM_IDLE, type VenueFormState } from "@/app/admin/venues/error-keys";
import { buttonStyles } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import type { AdminVenue, VenueSectionOption } from "@/lib/data/admin/venues";
import { SLUG_PATTERN } from "@/lib/utils/slug";

/**
 * Venue create/edit form, shared by both routes.
 *
 * One component for both because the fields, validation, and error rendering are
 * identical - only the action and the initial values differ. Two copies would guarantee
 * that a change to one eventually forgets the other.
 *
 * A Client Component solely for `useActionState`, which supplies the pending flag and the
 * per-field error keys the Server Action returns. No validation decision is made here:
 * the browser attributes are hints that save a round trip, and the same Zod schema that
 * the action runs is the authority. Nothing here can be trusted and nothing here needs to
 * be.
 *
 * All copy arrives as props. There is no `NextIntlClientProvider` in this project, so the
 * message catalogues stay out of the client bundle.
 *
 * CONTENT IS ARABIC, THE INTERFACE MAY NOT BE. `name`, `description`, and the section
 * selector carry `lang="ar" dir="rtl"` explicitly rather than inheriting, so the fields
 * stay right-to-left even when the dashboard is being used in English - the section
 * options are Arabic names and the venue name and description are Arabic content. `slug`
 * and `displayOrder` are the opposite: Latin/digits, order-significant, so they are
 * pinned `dir="ltr"`.
 */

export interface VenueFormLabels {
  readonly name: string;
  readonly section: string;
  readonly slug: string;
  readonly description: string;
  readonly displayOrder: string;
  readonly isActive: string;
  readonly hintName: string;
  readonly hintSection: string;
  readonly hintSlug: string;
  readonly hintDescription: string;
  readonly hintDisplayOrder: string;
  /** Placeholder option shown before any section is chosen. */
  readonly selectSection: string;
  readonly optional: string;
  readonly save: string;
  readonly saving: string;
  readonly cancel: string;
  /** Validation and action error keys mapped to localized sentences. */
  readonly errors: Readonly<Record<string, string>>;
}

interface VenueFormProps {
  readonly action: (state: VenueFormState, formData: FormData) => Promise<VenueFormState>;
  readonly labels: VenueFormLabels;
  /** Sections the venue may be placed under, in display order. */
  readonly sections: readonly VenueSectionOption[];
  readonly cancelHref: string;
  /** Absent when creating. */
  readonly venue?: AdminVenue;
}

/** Describes a field by its error element, only when that element exists. */
function describedBy(id: string, hasError: boolean): string {
  return hasError ? `${id}-hint ${id}-error` : `${id}-hint`;
}

export function VenueForm({ action, labels, sections, cancelHref, venue }: VenueFormProps) {
  const [state, formAction, pending] = useActionState(action, VENUE_FORM_IDLE);

  const fieldErrors = state.status === "invalid" ? state.fields : {};
  const actionError = state.status === "error" ? labels.errors[state.error] : null;

  return (
    <form action={formAction} aria-busy={pending} className="flex max-w-160 flex-col gap-8">
      {venue ? <input type="hidden" name="id" value={venue.id} /> : null}

      {/*
        Always mounted so assistive technology is already observing this region when a
        message appears. Creating the region together with the message is the usual reason
        an alert is never announced.
      */}
      <div role="alert" aria-live="polite">
        {actionError ? (
          <p className="rounded-control border border-error/45 bg-error/5 px-4 py-3 text-sm">
            {actionError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="venue-name" className="text-sm font-semibold">
          {labels.name}
        </label>
        <input
          id="venue-name"
          name="name"
          type="text"
          required
          maxLength={160}
          defaultValue={venue?.name ?? ""}
          lang="ar"
          dir="rtl"
          disabled={pending}
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={describedBy("venue-name", Boolean(fieldErrors.name))}
          className={controlStyles()}
        />
        <p id="venue-name-hint" className="text-sm text-foreground-muted">
          {labels.hintName}
        </p>
        {fieldErrors.name ? (
          <p id="venue-name-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.name]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="venue-section" className="text-sm font-semibold">
          {labels.section}
        </label>
        <select
          id="venue-section"
          name="sectionId"
          required
          defaultValue={venue?.section_id ?? ""}
          lang="ar"
          dir="rtl"
          disabled={pending}
          aria-invalid={fieldErrors.sectionId ? true : undefined}
          aria-describedby={describedBy("venue-section", Boolean(fieldErrors.sectionId))}
          className={controlStyles()}
        >
          {/* `disabled` stops the placeholder being submitted; `hidden` keeps it out of
              the dropdown list. On the rare edit where the venue's section is no longer
              among the options, nothing is pre-selected and the admin must choose again -
              the server refuses a silent remap, so leaving it blank is the safe state. */}
          <option value="" disabled hidden>
            {labels.selectSection}
          </option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
        <p id="venue-section-hint" className="text-sm text-foreground-muted">
          {labels.hintSection}
        </p>
        {fieldErrors.sectionId ? (
          <p id="venue-section-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.sectionId]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="venue-slug" className="text-sm font-semibold">
          {labels.slug}
        </label>
        <input
          id="venue-slug"
          name="slug"
          type="text"
          required
          maxLength={96}
          // Mirrors the database constraint. Taken from the shared source so the browser
          // hint cannot describe a different rule from the one that is enforced.
          pattern={SLUG_PATTERN.source}
          defaultValue={venue?.slug ?? ""}
          dir="ltr"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          disabled={pending}
          aria-invalid={fieldErrors.slug ? true : undefined}
          aria-describedby={describedBy("venue-slug", Boolean(fieldErrors.slug))}
          className={controlStyles()}
        />
        <p id="venue-slug-hint" className="text-sm text-foreground-muted">
          {labels.hintSlug}
        </p>
        {fieldErrors.slug ? (
          <p id="venue-slug-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.slug]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="venue-description" className="text-sm font-semibold">
          {labels.description}{" "}
          <span className="font-normal text-foreground-muted">({labels.optional})</span>
        </label>
        <textarea
          id="venue-description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={venue?.description ?? ""}
          lang="ar"
          dir="rtl"
          disabled={pending}
          aria-invalid={fieldErrors.description ? true : undefined}
          aria-describedby={describedBy("venue-description", Boolean(fieldErrors.description))}
          className={controlStyles()}
        />
        <p id="venue-description-hint" className="text-sm text-foreground-muted">
          {labels.hintDescription}
        </p>
        {fieldErrors.description ? (
          <p id="venue-description-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.description]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="venue-order" className="text-sm font-semibold">
          {labels.displayOrder}
        </label>
        <input
          id="venue-order"
          name="displayOrder"
          type="number"
          required
          min={0}
          step={1}
          defaultValue={venue?.display_order ?? 0}
          dir="ltr"
          disabled={pending}
          aria-invalid={fieldErrors.displayOrder ? true : undefined}
          aria-describedby={describedBy("venue-order", Boolean(fieldErrors.displayOrder))}
          className={`${controlStyles()} max-w-40`}
        />
        <p id="venue-order-hint" className="text-sm text-foreground-muted">
          {labels.hintDisplayOrder}
        </p>
        {fieldErrors.displayOrder ? (
          <p id="venue-order-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.displayOrder]}
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-3 border-t border-border pt-6 text-sm font-semibold">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={venue?.is_active ?? true}
          disabled={pending}
          className="size-4 accent-[var(--color-success)]"
        />
        {labels.isActive}
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonStyles()}>
          {pending ? labels.saving : labels.save}
        </button>
        <Link href={cancelHref} className={buttonStyles({ variant: "ghost" })}>
          {labels.cancel}
        </Link>
      </div>
    </form>
  );
}
