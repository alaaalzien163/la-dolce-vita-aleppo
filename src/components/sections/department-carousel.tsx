"use client";

import type { Locale } from "next-intl";
import Image from "next/image";
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { getDirection } from "@/i18n/direction";
import type { PublicSectionImage } from "@/types/content";

import styles from "./department-carousel.module.css";

/**
 * A premium, calm image carousel for one Department's `section_images`.
 *
 * PURE PRESENTATION. Supabase never appears here: the page fetches the images and
 * hands this component the already-mapped rows plus a `departmentName` (the fallback
 * alt text) and `locale` (for direction-aware navigation).
 *
 * NO I18N HOOKS. This project deliberately renders no `NextIntlClientProvider`, so
 * every label arrives as a prop. The two labels that carry live values use plain
 * `%index%` / `%total%` tokens (never ICU) - next-intl passes those through verbatim
 * and this component substitutes the numbers itself, keeping the message catalogues
 * out of the client bundle. See `DepartmentCarouselLabels`.
 *
 * DESIGN. One large photograph at a time in a fixed frame (no layout shift). Only
 * the active slide exists in the DOM, so untouched images are never downloaded -
 * the first one loads eagerly (LCP), later ones load lazily exactly when the
 * visitor reaches them. Transitions are a restrained 500ms fade, disabled entirely
 * under `prefers-reduced-motion`.
 *
 * INTERACTION. Previous/next buttons, swipe (direction-aware in RTL), the arrow
 * keys while a control has focus, and a compact dot track plus a `01 / 05` counter
 * in a bar BELOW the frame - nothing is overlaid on the photograph.
 *
 * FAILURE. A slide whose image fails to load is quietly dropped from rotation; if
 * every slide fails the component renders nothing rather than a broken widget. A
 * single image renders with no controls at all; zero images means the page does not
 * mount it.
 */

/** Fully-prepared labels. The `slideLabel` and `goToImage` strings may contain
 * `%index%` and `%total%` tokens, which this component replaces at render time. */
export interface DepartmentCarouselLabels {
  readonly regionLabel: string;
  readonly previousImage: string;
  readonly nextImage: string;
  readonly slideLabel: string;
  readonly goToImage: string;
}

interface DepartmentCarouselProps {
  readonly images: readonly PublicSectionImage[];
  readonly departmentName: string;
  readonly locale: Locale;
  readonly labels: DepartmentCarouselLabels;
}

/** Replaces the `%key%` tokens of a prepared label. Unknown tokens stay verbatim. */
function interpolate(template: string, values: Record<string, number>): string {
  return template.replace(/%(\w+)%/g, (_, key: string) => {
    const value = values[key];
    return value === undefined ? `%${key}%` : String(value);
  });
}

/** The minimum drag distance (px) that counts as a swipe. */
const SWIPE_THRESHOLD = 48;

export function DepartmentCarousel({
  images,
  departmentName,
  locale,
  labels,
}: DepartmentCarouselProps) {
  const isRtl = getDirection(locale) === "rtl";

  // Deliberately not a `useReducer`-free ref of animations: the single-source state
  // is the slide index, and everything else derives from it.
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const drag = useRef<{ startX: number; startY: number; axis: "x" | "y" | null }>({
    startX: 0,
    startY: 0,
    axis: null,
  });

  const available = useMemo(
    () => images.filter((image) => !failed.has(image.id)),
    [images, failed],
  );

  const total = available.length;
  const current = Math.min(index, total - 1);
  const currentImage = available[current];

  if (total === 0 || !currentImage) {
    return null;
  }

  const goTo = (target: number) => setIndex(((target % total) + total) % total);
  const previous = () => goTo(current - 1);
  const next = () => goTo(current + 1);

  const markFailed = (id: string) => {
    setFailed((previousSet) => (previousSet.has(id) ? previousSet : new Set(previousSet).add(id)));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (isRtl) {
        next();
      } else {
        previous();
      }
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (isRtl) {
        previous();
      } else {
        next();
      }
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { startX: event.clientX, startY: event.clientY, axis: null };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const currentDrag = drag.current;
    if (currentDrag.axis === "y") {
      return;
    }
    const dx = event.clientX - currentDrag.startX;
    const dy = event.clientY - currentDrag.startY;
    if (currentDrag.axis === null && Math.hypot(dx, dy) > 8) {
      // Lock the gesture axis once a direction wins, so a diagonal scroll does not
      // fight the page.
      currentDrag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
  };

  const resetDrag = () => {
    drag.current = { startX: 0, startY: 0, axis: null };
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current.axis !== "x") {
      resetDrag();
      return;
    }
    const dx = event.clientX - drag.current.startX;
    resetDrag();

    if (Math.abs(dx) < SWIPE_THRESHOLD) {
      return;
    }
    // Dragging toward the "next" end advances the slide, mirrored for RTL: in
    // Arabic, forward is to the left of the reader, so a leftward finger pull
    // brings the next image in - the same physical metaphor, not transposed icons.
    if (dx < 0) {
      if (isRtl) {
        previous();
      } else {
        next();
      }
    } else if (isRtl) {
      next();
    } else {
      previous();
    }
  };

  const counter = `${String(current + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

  const chevronStart = (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.controlChevronStart}
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
  const chevronEnd = (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.controlChevronEnd}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={labels.regionLabel}
      className={styles.region}
    >
      <div
        className={styles.viewport}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetDrag}
      >
        <div
          className={styles.frame}
          role="group"
          aria-roledescription="slide"
          aria-label={interpolate(labels.slideLabel, { index: current + 1, total })}
        >
          <Image
            key={currentImage.id}
            src={currentImage.imageUrl}
            // `alt_text` is the meaningful description when present; otherwise the
            // department's own name carries the same precedent `DepartmentCard`
            // already sets. Never an invented caption, never empty for a
            // content-bearing image.
            alt={currentImage.altText ?? departmentName}
            fill
            sizes="(min-width: 640px) 75vw, 100vw"
            loading={current === 0 ? "eager" : "lazy"}
            fetchPriority={current === 0 ? "high" : "auto"}
            onError={() => markFailed(currentImage.id)}
            className={styles.image}
          />
        </div>
      </div>

      {total > 1 ? (
        <div className={styles.controls} onKeyDown={handleKeyDown}>
          <button
            type="button"
            className={styles.control}
            aria-label={labels.previousImage}
            onClick={previous}
          >
            {chevronStart}
          </button>

          <div className={styles.dots}>
            {available.map((image, position) => (
              <button
                key={image.id}
                type="button"
                className={position === current ? styles.dotActive : styles.dot}
                aria-label={interpolate(labels.goToImage, { index: position + 1 })}
                aria-current={position === current}
                onClick={() => goTo(position)}
              />
            ))}
            <span className={styles.counter} aria-hidden="true">
              {counter}
            </span>
          </div>

          <button
            type="button"
            className={styles.control}
            aria-label={labels.nextImage}
            onClick={next}
          >
            {chevronEnd}
          </button>
        </div>
      ) : null}
    </div>
  );
}
