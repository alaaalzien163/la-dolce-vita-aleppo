"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  MENU_CATEGORY_FORM_IDLE,
  type MenuCategoryFormState,
} from "@/app/admin/menu-categories/error-keys";
import { buttonStyles } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import type { AdminMenuCategory, MenuCategoryParentGroup } from "@/lib/data/admin/menu-categories";
import { SLUG_PATTERN } from "@/lib/utils/slug";

/**
 * Category create/edit form, shared by both routes.
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
 * THE PARENT SELECTOR USES `<optgroup>`, NOT A CONCATENATED LABEL. Main-category names
 * repeat across menus, so "المقبلات" alone does not identify a parent. Grouping the options
 * under their menu supplies the missing half of the identity using the element the platform
 * already has for it: a screen reader announces the group name with the option, and no
 * separator character has to be invented or mirrored for RTL.
 *
 * CONTENT IS ARABIC, THE INTERFACE MAY NOT BE. `name`, `description`, and the parent
 * selector carry `lang="ar" dir="rtl"` explicitly rather than inheriting, so the fields stay
 * right-to-left even when the dashboard is being used in English. `slug` and `displayOrder`
 * are the opposite: Latin/digits, order-significant, so they are pinned `dir="ltr"`.
 */

export interface MenuCategoryFormLabels {
  readonly name: string;
  readonly mainCategory: string;
  readonly slug: string;
  readonly description: string;
  readonly displayOrder: string;
  readonly isActive: string;
  readonly hintName: string;
  readonly hintMainCategory: string;
  readonly hintSlug: string;
  readonly hintDescription: string;
  readonly hintDisplayOrder: string;
  /** Placeholder option shown before any parent is chosen. */
  readonly selectMainCategory: string;
  /** Group label for parents whose menu the admin cannot read. */
  readonly unknownMenu: string;
  readonly optional: string;
  readonly save: string;
  readonly saving: string;
  readonly cancel: string;
  /** Validation and action error keys mapped to localized sentences. */
  readonly errors: Readonly<Record<string, string>>;
}

interface MenuCategoryFormProps {
  readonly action: (
    state: MenuCategoryFormState,
    formData: FormData,
  ) => Promise<MenuCategoryFormState>;
  readonly labels: MenuCategoryFormLabels;
  /** Main categories the category may be placed under, grouped by menu. */
  readonly parentGroups: readonly MenuCategoryParentGroup[];
  readonly cancelHref: string;
  /** Absent when creating. */
  readonly category?: AdminMenuCategory;
}

/** Describes a field by its error element, only when that element exists. */
function describedBy(id: string, hasError: boolean): string {
  return hasError ? `${id}-hint ${id}-error` : `${id}-hint`;
}

export function MenuCategoryForm({
  action,
  labels,
  parentGroups,
  cancelHref,
  category,
}: MenuCategoryFormProps) {
  const [state, formAction, pending] = useActionState(action, MENU_CATEGORY_FORM_IDLE);

  const fieldErrors = state.status === "invalid" ? state.fields : {};
  const actionError = state.status === "error" ? labels.errors[state.error] : null;

  return (
    <form action={formAction} aria-busy={pending} className="flex max-w-160 flex-col gap-8">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}

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
        <label htmlFor="menu-category-name" className="text-sm font-semibold">
          {labels.name}
        </label>
        <input
          id="menu-category-name"
          name="name"
          type="text"
          required
          maxLength={160}
          defaultValue={category?.name ?? ""}
          lang="ar"
          dir="rtl"
          disabled={pending}
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={describedBy("menu-category-name", Boolean(fieldErrors.name))}
          className={controlStyles()}
        />
        <p id="menu-category-name-hint" className="text-sm text-foreground-muted">
          {labels.hintName}
        </p>
        {fieldErrors.name ? (
          <p id="menu-category-name-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.name]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="menu-category-parent" className="text-sm font-semibold">
          {labels.mainCategory}
        </label>
        <select
          id="menu-category-parent"
          name="mainCategoryId"
          required
          defaultValue={category?.main_category_id ?? ""}
          lang="ar"
          dir="rtl"
          disabled={pending}
          aria-invalid={fieldErrors.mainCategoryId ? true : undefined}
          aria-describedby={describedBy(
            "menu-category-parent",
            Boolean(fieldErrors.mainCategoryId),
          )}
          className={controlStyles()}
        >
          {/* `disabled` stops the placeholder being submitted; `hidden` keeps it out of the
              dropdown list. On the rare edit where the category's parent is no longer among
              the options, nothing is pre-selected and the admin must choose again - the
              server refuses a silent remap, so leaving it blank is the safe state. */}
          <option value="" disabled hidden>
            {labels.selectMainCategory}
          </option>
          {parentGroups.map((group) => (
            <optgroup key={group.menuId} label={group.menuName ?? labels.unknownMenu}>
              {group.mainCategories.map((mainCategory) => (
                <option key={mainCategory.id} value={mainCategory.id}>
                  {mainCategory.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p id="menu-category-parent-hint" className="text-sm text-foreground-muted">
          {labels.hintMainCategory}
        </p>
        {fieldErrors.mainCategoryId ? (
          <p id="menu-category-parent-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.mainCategoryId]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="menu-category-slug" className="text-sm font-semibold">
          {labels.slug}
        </label>
        <input
          id="menu-category-slug"
          name="slug"
          type="text"
          required
          maxLength={96}
          // Mirrors the database constraint. Taken from the shared source so the browser
          // hint cannot describe a different rule from the one that is enforced.
          pattern={SLUG_PATTERN.source}
          defaultValue={category?.slug ?? ""}
          dir="ltr"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          disabled={pending}
          aria-invalid={fieldErrors.slug ? true : undefined}
          aria-describedby={describedBy("menu-category-slug", Boolean(fieldErrors.slug))}
          className={controlStyles()}
        />
        <p id="menu-category-slug-hint" className="text-sm text-foreground-muted">
          {labels.hintSlug}
        </p>
        {fieldErrors.slug ? (
          <p id="menu-category-slug-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.slug]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="menu-category-description" className="text-sm font-semibold">
          {labels.description}{" "}
          <span className="font-normal text-foreground-muted">({labels.optional})</span>
        </label>
        <textarea
          id="menu-category-description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={category?.description ?? ""}
          lang="ar"
          dir="rtl"
          disabled={pending}
          aria-invalid={fieldErrors.description ? true : undefined}
          aria-describedby={describedBy(
            "menu-category-description",
            Boolean(fieldErrors.description),
          )}
          className={controlStyles()}
        />
        <p id="menu-category-description-hint" className="text-sm text-foreground-muted">
          {labels.hintDescription}
        </p>
        {fieldErrors.description ? (
          <p id="menu-category-description-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.description]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="menu-category-order" className="text-sm font-semibold">
          {labels.displayOrder}
        </label>
        <input
          id="menu-category-order"
          name="displayOrder"
          type="number"
          required
          min={0}
          step={1}
          defaultValue={category?.display_order ?? 0}
          dir="ltr"
          disabled={pending}
          aria-invalid={fieldErrors.displayOrder ? true : undefined}
          aria-describedby={describedBy("menu-category-order", Boolean(fieldErrors.displayOrder))}
          className={`${controlStyles()} max-w-40`}
        />
        <p id="menu-category-order-hint" className="text-sm text-foreground-muted">
          {labels.hintDisplayOrder}
        </p>
        {fieldErrors.displayOrder ? (
          <p id="menu-category-order-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.displayOrder]}
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-3 border-t border-border pt-6 text-sm font-semibold">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={category?.is_active ?? true}
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
