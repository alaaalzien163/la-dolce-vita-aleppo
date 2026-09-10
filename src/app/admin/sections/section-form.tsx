"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useActionState } from "react";

import { SECTION_FORM_IDLE, type SectionFormState } from "@/app/admin/sections/error-keys";
import { buttonStyles } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import type { AdminSection } from "@/lib/data/admin/sections";
import { SLUG_PATTERN } from "@/lib/utils/slug";

/**
 * Section create/edit form, shared by both routes.
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
 * CONTENT IS ARABIC, THE INTERFACE MAY NOT BE. `name` and `description` carry
 * `lang="ar" dir="rtl"` explicitly rather than inheriting, so the fields stay
 * right-to-left even when the dashboard is being used in English. `slug` is the opposite
 * case: it is a Latin URL identifier, so it is pinned `dir="ltr"`.
 */

export interface SectionFormLabels {
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly displayOrder: string;
  readonly isActive: string;
  readonly hintName: string;
  readonly hintSlug: string;
  readonly hintDescription: string;
  readonly hintDisplayOrder: string;
  readonly optional: string;
  readonly save: string;
  readonly saving: string;
  readonly cancel: string;
  /** Validation and action error keys mapped to localized sentences. */
  readonly errors: Readonly<Record<string, string>>;
}

interface SectionFormProps {
  readonly action: (state: SectionFormState, formData: FormData) => Promise<SectionFormState>;
  readonly labels: SectionFormLabels;
  readonly cancelHref: string;
  /** Absent when creating. */
  readonly section?: AdminSection;
}

/** Describes a field by its error element, only when that element exists. */
function describedBy(id: string, hasError: boolean): string {
  return hasError ? `${id}-hint ${id}-error` : `${id}-hint`;
}

export function SectionForm({ action, labels, cancelHref, section }: SectionFormProps) {
  const [state, formAction, pending] = useActionState(action, SECTION_FORM_IDLE);
  const router = useRouter();

  const fieldErrors = state.status === "invalid" ? state.fields : {};
  const actionError = state.status === "error" ? labels.errors[state.error] : null;

  useEffect(() => {
    if (state.status === "success" && "createdId" in state) {
      router.replace(`/admin/sections/${state.createdId}/edit`);
    }
  }, [state, router]);

  return (
    <form action={formAction} aria-busy={pending} className="flex max-w-160 flex-col gap-8">
      {section ? <input type="hidden" name="id" value={section.id} /> : null}

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
        <label htmlFor="section-name" className="text-sm font-semibold">
          {labels.name}
        </label>
        <input
          id="section-name"
          name="name"
          type="text"
          required
          maxLength={160}
          defaultValue={section?.name ?? ""}
          lang="ar"
          dir="rtl"
          disabled={pending}
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={describedBy("section-name", Boolean(fieldErrors.name))}
          className={controlStyles()}
        />
        <p id="section-name-hint" className="text-sm text-foreground-muted">
          {labels.hintName}
        </p>
        {fieldErrors.name ? (
          <p id="section-name-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.name]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="section-slug" className="text-sm font-semibold">
          {labels.slug}
        </label>
        <input
          id="section-slug"
          name="slug"
          type="text"
          required
          maxLength={96}
          // Mirrors the database constraint. Taken from the shared source so the browser
          // hint cannot describe a different rule from the one that is enforced.
          pattern={SLUG_PATTERN.source}
          defaultValue={section?.slug ?? ""}
          dir="ltr"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          disabled={pending}
          aria-invalid={fieldErrors.slug ? true : undefined}
          aria-describedby={describedBy("section-slug", Boolean(fieldErrors.slug))}
          className={controlStyles()}
        />
        <p id="section-slug-hint" className="text-sm text-foreground-muted">
          {labels.hintSlug}
        </p>
        {fieldErrors.slug ? (
          <p id="section-slug-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.slug]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="section-description" className="text-sm font-semibold">
          {labels.description}{" "}
          <span className="font-normal text-foreground-muted">({labels.optional})</span>
        </label>
        <textarea
          id="section-description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={section?.description ?? ""}
          lang="ar"
          dir="rtl"
          disabled={pending}
          aria-invalid={fieldErrors.description ? true : undefined}
          aria-describedby={describedBy("section-description", Boolean(fieldErrors.description))}
          className={controlStyles()}
        />
        <p id="section-description-hint" className="text-sm text-foreground-muted">
          {labels.hintDescription}
        </p>
        {fieldErrors.description ? (
          <p id="section-description-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.description]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="section-order" className="text-sm font-semibold">
          {labels.displayOrder}
        </label>
        <input
          id="section-order"
          name="displayOrder"
          type="number"
          required
          min={0}
          step={1}
          defaultValue={section?.display_order ?? 0}
          dir="ltr"
          disabled={pending}
          aria-invalid={fieldErrors.displayOrder ? true : undefined}
          aria-describedby={describedBy("section-order", Boolean(fieldErrors.displayOrder))}
          className={`${controlStyles()} max-w-40`}
        />
        <p id="section-order-hint" className="text-sm text-foreground-muted">
          {labels.hintDisplayOrder}
        </p>
        {fieldErrors.displayOrder ? (
          <p id="section-order-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.displayOrder]}
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-3 border-t border-border pt-6 text-sm font-semibold">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={section?.is_active ?? true}
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
