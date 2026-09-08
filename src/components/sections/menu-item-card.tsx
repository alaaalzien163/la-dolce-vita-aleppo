"use client";

import Image from "next/image";
import { useId, useRef } from "react";

import { formatPublicPrice } from "@/lib/utils/public-price";
import type { PublicMenuItem } from "@/types/content";

interface MenuItemCardProps {
  readonly item: PublicMenuItem;
  readonly featuredLabel: string;
  readonly openLabel: string;
  readonly closeLabel: string;
}

const THUMBNAIL_SIZES = "(min-width: 1024px) 8rem, (min-width: 640px) 7rem, 6rem";
const DIALOG_IMAGE_SIZES = "(min-width: 768px) 38rem, calc(100vw - 3rem)";

/**
 * Compact menu-item trigger with a native modal for the complete details.
 *
 * Only this interaction boundary is a Client Component; the menu hierarchy,
 * Supabase reads, and localized page remain server-rendered and statically built.
 * Native `<dialog>` supplies Escape handling and modal focus containment, while
 * `close()` restores focus to the button that opened it.
 */
export function MenuItemCard({ item, featuredLabel, openLabel, closeLabel }: MenuItemCardProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const { name, description, price, currency, imageUrl, isFeatured } = item;
  const priceText = formatPublicPrice(price, currency);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={openLabel}
        onClick={() => dialogRef.current?.showModal()}
        className="group flex min-h-24 w-full overflow-hidden rounded-card border border-border bg-surface text-start shadow-card transition-[border-color,box-shadow] duration-200 ease-out hover:border-accent-line hover:shadow-raised"
      >
        {imageUrl ? (
          <span className="relative w-24 shrink-0 overflow-hidden bg-surface-muted sm:w-28 lg:w-32">
            <Image src={imageUrl} alt="" fill sizes={THUMBNAIL_SIZES} className="object-cover" />
          </span>
        ) : null}

        <span className="flex min-w-0 flex-1 flex-col justify-center p-4">
          <span className="flex items-start justify-between gap-3">
            <span lang="ar" dir="auto" className="font-medium text-heading">
              {name}
            </span>
            {priceText ? (
              <data
                value={String(price)}
                className="shrink-0 text-sm font-semibold whitespace-nowrap"
              >
                <span dir="ltr">{priceText}</span>
              </data>
            ) : null}
          </span>

          {isFeatured ? (
            <span className="mt-2 w-fit rounded-pill border border-accent-line px-2 py-0.5 text-eyebrow font-semibold tracking-eyebrow text-accent-ink uppercase">
              {featuredLabel}
            </span>
          ) : null}
        </span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            dialogRef.current.close();
          }
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(38rem,calc(100%-2rem))] overflow-y-auto rounded-panel border border-border bg-surface p-0 text-foreground shadow-raised backdrop:bg-surface-inverse/70"
      >
        {imageUrl ? (
          <div className="relative aspect-[3/2] w-full overflow-hidden bg-surface-muted">
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes={DIALOG_IMAGE_SIZES}
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <h3
              id={titleId}
              lang="ar"
              dir="auto"
              className="text-display-sm font-medium text-heading"
            >
              {name}
            </h3>
            {priceText ? (
              <data
                value={String(price)}
                className="shrink-0 text-lg font-semibold whitespace-nowrap"
              >
                <span dir="ltr">{priceText}</span>
              </data>
            ) : null}
          </div>

          {isFeatured ? (
            <span className="mt-4 inline-block rounded-pill border border-accent-line px-2.5 py-0.5 text-eyebrow font-semibold tracking-eyebrow text-accent-ink uppercase">
              {featuredLabel}
            </span>
          ) : null}

          {description ? (
            <p id={descriptionId} lang="ar" dir="auto" className="mt-5 text-foreground-muted">
              {description}
            </p>
          ) : null}

          <form method="dialog" className="mt-8 flex justify-end">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-control border border-border-strong px-4 text-sm font-semibold transition-colors duration-150 ease-out hover:bg-surface-muted"
            >
              {closeLabel}
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
