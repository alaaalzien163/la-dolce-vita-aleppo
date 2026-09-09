"use client";

import Link from "next/link";
import { useActionState } from "react";

import { MENU_ITEM_FORM_IDLE, type MenuItemFormState } from "@/app/admin/menu-items/error-keys";
import { buttonStyles } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import type { AdminMenuItem, MenuItemCategoryGroup } from "@/lib/data/admin/menu-items";

/**
 * Menu-item create/edit form, shared by both routes.
 *
 * One component for both because the fields, validation, and error rendering are identical -
 * only the action and the initial values differ. Two copies would guarantee that a change to one
 * eventually forgets the other.
 *
 * A Client Component solely for `useActionState`, which supplies the pending flag and the
 * per-field error keys the Server Action returns. No validation decision is made here: the
 * browser attributes are hints that save a round trip, and the same Zod schema that the action
 * runs is the authority. Nothing here can be trusted and nothing here needs to be.
 *
 * All copy arrives as props, including the pre-composed category group labels. There is no
 * `NextIntlClientProvider` in this project, so the message catalogues stay out of the client
 * bundle entirely.
 *
 * THE CATEGORY SELECTOR USES `<optgroup>`. This is the deepest level of the hierarchy and names
 * repeat at every step above it, so the category name alone does not identify a parent. Each
 * group carries its menu and main category, composed by the server from a catalogue message, and
 * a screen reader announces that group name together with the option - three levels conveyed by
 * the element the platform already provides for exactly this, with no separator glyph hardcoded
 * in the component.
 *
 * CONTENT IS ARABIC, THE INTERFACE MAY NOT BE. `name`, `description`, and the category selector
 * carry `lang="ar" dir="rtl"` explicitly rather than inheriting, so they stay right-to-left even
 * when the dashboard is being used in English. `price`, `currency`, and `displayOrder` are the
 * opposite: digits and codes, order-significant, so they are pinned `dir="ltr"`.
 */

export interface MenuItemFormLabels {
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly price: string;
  readonly currency: string;
  readonly image: string;
  readonly displayOrder: string;
  readonly isAvailable: string;
  readonly isFeatured: string;
  readonly hintName: string;
  readonly hintCategory: string;
  readonly hintDescription: string;
  readonly hintPrice: string;
  readonly hintCurrency: string;
  readonly hintImage: string;
  readonly hintDisplayOrder: string;
  readonly selectCategory: string;
  readonly optional: string;
  readonly currentImage: string;
  readonly removeImage: string;
  readonly replaceImageHint: string;
  readonly save: string;
  readonly saving: string;
  readonly cancel: string;
  readonly uploadUnavailableTitle: string;
  readonly uploadUnavailableDescription: string;
  /** Whether a storage bucket is configured for menu-item images. */
  readonly uploadAvailable: boolean;
  /** Supported currencies. Empty means the column is left to its database default. */
  readonly currencies: readonly string[];
  /** One label per category group, index-aligned with `groups`. */
  readonly groupLabels: readonly string[];
  /** Validation, action, and storage error keys mapped to localized sentences. */
  readonly errors: Readonly<Record<string, string>>;
}

interface MenuItemFormProps {
  readonly action: (state: MenuItemFormState, formData: FormData) => Promise<MenuItemFormState>;
  readonly labels: MenuItemFormLabels;
  /** Categories the item may belong to, grouped by main category. */
  readonly groups: readonly MenuItemCategoryGroup[];
  readonly cancelHref: string;
  /** Absent when creating. */
  readonly item?: AdminMenuItem;
}

/** Describes a field by its error element, only when that element exists. */
function describedBy(id: string, hasError: boolean): string {
  return hasError ? `${id}-hint ${id}-error` : `${id}-hint`;
}

export function MenuItemForm({ action, labels, groups, cancelHref, item }: MenuItemFormProps) {
  const [state, formAction, pending] = useActionState(action, MENU_ITEM_FORM_IDLE);

  const fieldErrors = state.status === "invalid" ? state.fields : {};
  const actionError = state.status === "error" ? labels.errors[state.error] : null;

  return (
    <form action={formAction} aria-busy={pending} className="flex max-w-160 flex-col gap-8">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      {/*
        Always mounted so assistive technology is already observing this region when a message
        appears. Creating the region together with the message is the usual reason an alert is
        never announced.
      */}
      <div role="alert" aria-live="polite">
        {actionError ? (
          <p className="rounded-control border border-error/45 bg-error/5 px-4 py-3 text-sm">
            {actionError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="menu-item-name" className="text-sm font-semibold">
          {labels.name}
        </label>
        <input
          id="menu-item-name"
          name="name"
          type="text"
          required
          maxLength={160}
          defaultValue={item?.name ?? ""}
          lang="ar"
          dir="rtl"
          disabled={pending}
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={describedBy("menu-item-name", Boolean(fieldErrors.name))}
          className={controlStyles()}
        />
        <p id="menu-item-name-hint" className="text-sm text-foreground-muted">
          {labels.hintName}
        </p>
        {fieldErrors.name ? (
          <p id="menu-item-name-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.name]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="menu-item-category" className="text-sm font-semibold">
          {labels.category}
        </label>
        <select
          id="menu-item-category"
          name="categoryId"
          required
          defaultValue={item?.category_id ?? ""}
          lang="ar"
          dir="rtl"
          disabled={pending}
          aria-invalid={fieldErrors.categoryId ? true : undefined}
          aria-describedby={describedBy("menu-item-category", Boolean(fieldErrors.categoryId))}
          className={controlStyles()}
        >
          {/* `disabled` stops the placeholder being submitted; `hidden` keeps it out of the
              dropdown list. On the rare edit where the item's category is no longer among the
              options, nothing is pre-selected and the admin must choose again - the server
              refuses a silent remap, so leaving it blank is the safe state. */}
          <option value="" disabled hidden>
            {labels.selectCategory}
          </option>
          {groups.map((group, index) => (
            <optgroup
              key={group.mainCategoryId}
              label={labels.groupLabels[index] ?? group.mainCategoryName ?? ""}
            >
              {group.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p id="menu-item-category-hint" className="text-sm text-foreground-muted">
          {labels.hintCategory}
        </p>
        {fieldErrors.categoryId ? (
          <p id="menu-item-category-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.categoryId]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="menu-item-description" className="text-sm font-semibold">
          {labels.description}{" "}
          <span className="font-normal text-foreground-muted">({labels.optional})</span>
        </label>
        <textarea
          id="menu-item-description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={item?.description ?? ""}
          lang="ar"
          dir="rtl"
          disabled={pending}
          aria-invalid={fieldErrors.description ? true : undefined}
          aria-describedby={describedBy("menu-item-description", Boolean(fieldErrors.description))}
          className={controlStyles()}
        />
        <p id="menu-item-description-hint" className="text-sm text-foreground-muted">
          {labels.hintDescription}
        </p>
        {fieldErrors.description ? (
          <p id="menu-item-description-error" className="text-sm font-medium text-error">
            {labels.errors[fieldErrors.description]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="menu-item-price" className="text-sm font-semibold">
            {labels.price}{" "}
            <span className="font-normal text-foreground-muted">({labels.optional})</span>
          </label>
          {/*
            `type="text"` with a numeric input mode rather than `type="number"`. A number input
            silently accepts locale decimal separators and exponent notation in some browsers,
            and reports an empty string for a value it considers invalid - which would turn a
             typo into "price is not a valid amount". Text keeps
            exactly what was typed so the server can say precisely what is wrong.
          */}
          <input
            id="menu-item-price"
            name="price"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={item?.price === null || !item ? "" : String(item.price)}
            dir="ltr"
            disabled={pending}
            aria-invalid={fieldErrors.price ? true : undefined}
            aria-describedby={describedBy("menu-item-price", Boolean(fieldErrors.price))}
            className={`${controlStyles()} max-w-48`}
          />
          <p id="menu-item-price-hint" className="text-sm text-foreground-muted">
            {labels.hintPrice}
          </p>
          {fieldErrors.price ? (
            <p id="menu-item-price-error" className="text-sm font-medium text-error">
              {labels.errors[fieldErrors.price]}
            </p>
          ) : null}
        </div>

        {/*
          Rendered only when a supported currency set is configured. With no configured set the
          column is left to its database default, so offering a control that cannot be saved
          would be worse than offering none.
        */}
        {labels.currencies.length > 0 ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="menu-item-currency" className="text-sm font-semibold">
              {labels.currency}
            </label>
            <select
              id="menu-item-currency"
              name="currency"
              defaultValue={item?.currency ?? labels.currencies[0]}
              dir="ltr"
              disabled={pending}
              aria-invalid={fieldErrors.currency ? true : undefined}
              aria-describedby={describedBy("menu-item-currency", Boolean(fieldErrors.currency))}
              className={`${controlStyles()} max-w-40`}
            >
              {/* An item may already carry a currency outside the configured set. It is offered
                  so that saving an unrelated field cannot silently rewrite it. */}
              {item?.currency && !labels.currencies.includes(item.currency) ? (
                <option value={item.currency}>{item.currency}</option>
              ) : null}
              {labels.currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <p id="menu-item-currency-hint" className="text-sm text-foreground-muted">
              {labels.hintCurrency}
            </p>
            {fieldErrors.currency ? (
              <p id="menu-item-currency-error" className="text-sm font-medium text-error">
                {labels.errors[fieldErrors.currency]}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <label htmlFor="menu-item-order" className="text-sm font-semibold">
            {labels.displayOrder}
          </label>
          <input
            id="menu-item-order"
            name="displayOrder"
            type="number"
            required
            min={0}
            step={1}
            defaultValue={item?.display_order ?? 0}
            dir="ltr"
            disabled={pending}
            aria-invalid={fieldErrors.displayOrder ? true : undefined}
            aria-describedby={describedBy("menu-item-order", Boolean(fieldErrors.displayOrder))}
            className={`${controlStyles()} max-w-40`}
          />
          <p id="menu-item-order-hint" className="text-sm text-foreground-muted">
            {labels.hintDisplayOrder}
          </p>
          {fieldErrors.displayOrder ? (
            <p id="menu-item-order-error" className="text-sm font-medium text-error">
              {labels.errors[fieldErrors.displayOrder]}
            </p>
          ) : null}
        </div>
      </div>

      <fieldset className="flex flex-col gap-3 border-t border-border pt-6">
        <legend className="text-sm font-semibold">{labels.image}</legend>

        {labels.uploadAvailable ? (
          <>
            {item?.image_url ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-foreground-muted">{labels.currentImage}</p>
                {/*
                  A plain <img>, not next/image. This is a private admin preview of an arbitrary
                  stored URL; routing it through the optimizer would spend a transform on an
                  image only one person will ever look at.
                */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-24 w-auto rounded-card border border-border object-cover"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="removeImage"
                    disabled={pending}
                    className="size-4 accent-[var(--color-success)]"
                  />
                  {labels.removeImage}
                </label>
              </div>
            ) : null}

            <label htmlFor="menu-item-image" className="text-sm font-semibold">
              {item?.image_url ? labels.replaceImageHint : labels.image}{" "}
              <span className="font-normal text-foreground-muted">({labels.optional})</span>
            </label>
            <input
              id="menu-item-image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={pending}
              aria-describedby="menu-item-image-hint"
              className="block w-full text-sm"
            />
            <p id="menu-item-image-hint" className="text-sm text-foreground-muted">
              {labels.hintImage}
            </p>
          </>
        ) : (
          <div className="rounded-control border border-dashed border-border-strong/45 px-4 py-3">
            <p className="text-sm font-medium">{labels.uploadUnavailableTitle}</p>
            <p className="mt-1 text-sm text-foreground-muted">
              {labels.uploadUnavailableDescription}
            </p>
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3 border-t border-border pt-6">
        <legend className="text-sm font-semibold">{labels.isAvailable}</legend>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="isAvailable"
            defaultChecked={item?.is_available ?? true}
            disabled={pending}
            className="size-4 accent-[var(--color-success)]"
          />
          {labels.isAvailable}
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={item?.is_featured ?? false}
            disabled={pending}
            className="size-4 accent-[var(--color-success)]"
          />
          {labels.isFeatured}
        </label>
      </fieldset>

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
