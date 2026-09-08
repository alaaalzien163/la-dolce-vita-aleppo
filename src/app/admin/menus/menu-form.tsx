"use client";

import Link from "next/link";
import { useActionState } from "react";

import { MENU_FORM_IDLE, type MenuFormState } from "@/app/admin/menus/error-keys";
import { buttonStyles } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import type { AdminMenu, MenuVenueOption } from "@/lib/data/admin/menus";
import { SLUG_PATTERN } from "@/lib/utils/slug";

/**
 * Menu create/edit form, shared by both routes.
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
 * CONTENT IS ARABIC, THE INTERFACE MAY NOT BE. `name`, `description`, and the venue
 * selector carry `lang="ar" dir="rtl"` explicitly rather than inheriting, so the fields
 * stay right-to-left even when the dashboard is being used in English - the venue options
 * are Arabic names and the menu name and description are Arabic content. `slug` and
 * `displayOrder` are the opposite: Latin/digits, order-significant, so they are pinned
 * `dir="ltr"`.
 */

export interface MenuFormLabels {
  readonly name: string;
  readonly venue: string;
  readonly slug: string;
  readonly description: string;
  readonly displayOrder: string;
  readonly isActive: string;
  readonly hintName: string;
  readonly hintVenue: string;
  readonly hintSlug: string;
  readonly hintDescription: string;
  readonly hintDisplayOrder: string;
  /** Placeholder option shown before any venue is chosen. */
  readonly selectVenue: string;
  readonly optional: string;
  readonly save: string;
  readonly saving: string;
  readonly cancel: string;
  /** Validation and action error keys mapped to localized sentences. */
  readonly errors: Readonly<Record<string, string>>;
}

interface MenuFormProps {
  readonly action: (state: MenuFormState, formData: FormData) => Promise<MenuFormState>;
  readonly labels: MenuFormLabels;
  /** Venues the menu may be placed under, in display order. */
  readonly venues: readonly MenuVenueOption[];
  readonly cancelHref: string;
  /** Absent when creating. */
  readonly menu?: AdminMenu;
}

/** Describes a field by its error element, only when that element exists. */
function describedBy(id: string, hasError: boolean): string {
  return hasError ? `${id}-hint ${id}-error` : `${id}-hint`;
}

export function MenuForm({ action, labels, venues, cancelHref, menu }: MenuFormProps) {
  const [state, formAction, pending] = useActionState(action, MENU_FORM_IDLE);

  const fieldErrors = state.status === "invalid" ? state.fields : {};
  const actionError = state.status === "error" ? labels.errors[state.error] : null;

  return (
    <form action={formAction} aria-busy={pending} className="flex max-w-160 flex-col gap-8">
      {menu ? <input type="hidden" name="id" value={menu.id} /> : null}

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
        <label htmlFor="menu-name" className="text-sm font-semibold">
          {labels.name}
        </label>
        <input
          id="menu-name"
          name="name"
          type="text"
          required
          maxLength={160}
          defaultValue={menu?.name ?? ""}
          lang="ar"
          dir="rtl"
          disabled={pending}
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={describedBy("menu-name", Boolean(fieldErrors.name))}
          className={controlStyles()}
        />
        <p id="menu-name-hint" className="text-sm text-foreground-muted">
          {labels.hintName}
        </p>
        {fieldErrors.name ? (
          <p id="menu-name-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.name]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="menu-venue" className="text-sm font-semibold">
          {labels.venue}
        </label>
        <select
          id="menu-venue"
          name="venueId"
          required
          defaultValue={menu?.venue_id ?? ""}
          lang="ar"
          dir="rtl"
          disabled={pending}
          aria-invalid={fieldErrors.venueId ? true : undefined}
          aria-describedby={describedBy("menu-venue", Boolean(fieldErrors.venueId))}
          className={controlStyles()}
        >
          {/* `disabled` stops the placeholder being submitted; `hidden` keeps it out of
              the dropdown list. On the rare edit where the menu's venue is no longer among
              the options, nothing is pre-selected and the admin must choose again - the
              server refuses a silent remap, so leaving it blank is the safe state. */}
          <option value="" disabled hidden>
            {labels.selectVenue}
          </option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
        <p id="menu-venue-hint" className="text-sm text-foreground-muted">
          {labels.hintVenue}
        </p>
        {fieldErrors.venueId ? (
          <p id="menu-venue-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.venueId]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="menu-slug" className="text-sm font-semibold">
          {labels.slug}
        </label>
        <input
          id="menu-slug"
          name="slug"
          type="text"
          required
          maxLength={96}
          // Mirrors the database constraint. Taken from the shared source so the browser
          // hint cannot describe a different rule from the one that is enforced.
          pattern={SLUG_PATTERN.source}
          defaultValue={menu?.slug ?? ""}
          dir="ltr"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          disabled={pending}
          aria-invalid={fieldErrors.slug ? true : undefined}
          aria-describedby={describedBy("menu-slug", Boolean(fieldErrors.slug))}
          className={controlStyles()}
        />
        <p id="menu-slug-hint" className="text-sm text-foreground-muted">
          {labels.hintSlug}
        </p>
        {fieldErrors.slug ? (
          <p id="menu-slug-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.slug]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="menu-description" className="text-sm font-semibold">
          {labels.description}{" "}
          <span className="font-normal text-foreground-muted">({labels.optional})</span>
        </label>
        <textarea
          id="menu-description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={menu?.description ?? ""}
          lang="ar"
          dir="rtl"
          disabled={pending}
          aria-invalid={fieldErrors.description ? true : undefined}
          aria-describedby={describedBy("menu-description", Boolean(fieldErrors.description))}
          className={controlStyles()}
        />
        <p id="menu-description-hint" className="text-sm text-foreground-muted">
          {labels.hintDescription}
        </p>
        {fieldErrors.description ? (
          <p id="menu-description-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.description]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="menu-order" className="text-sm font-semibold">
          {labels.displayOrder}
        </label>
        <input
          id="menu-order"
          name="displayOrder"
          type="number"
          required
          min={0}
          step={1}
          defaultValue={menu?.display_order ?? 0}
          dir="ltr"
          disabled={pending}
          aria-invalid={fieldErrors.displayOrder ? true : undefined}
          aria-describedby={describedBy("menu-order", Boolean(fieldErrors.displayOrder))}
          className={`${controlStyles()} max-w-40`}
        />
        <p id="menu-order-hint" className="text-sm text-foreground-muted">
          {labels.hintDisplayOrder}
        </p>
        {fieldErrors.displayOrder ? (
          <p id="menu-order-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.displayOrder]}
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-3 border-t border-border pt-6 text-sm font-semibold">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={menu?.is_active ?? true}
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
