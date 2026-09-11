"use client";

import type { Locale } from "next-intl";
import Image from "next/image";
import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { getDirection } from "@/i18n/direction";
import type { PublicSectionMedia } from "@/types/content";

import styles from "./department-carousel.module.css";

/**
 * A premium, calm media carousel for one Department's `section_images`.
 *
 * Every active row is one slide: images render through `next/image`, videos through
 * a muted, looping HTML5 `<video>`. The counter, dots, dots keyboard access, and
 * navigation all treat the list as a single sequence - a video in position 3 of 5
 * is simply slide `03 / 05`.
 *
 * PURE PRESENTATION. Supabase never appears here: the page fetches the media and
 * hands this component the already-mapped rows plus a `departmentName` (the fallback
 * label) and `locale` (for direction-aware navigation).
 *
 * NO I18N HOOKS. This project deliberately renders no `NextIntlClientProvider`, so
 * every label arrives as a prop. The labels that carry live values use plain
 * `%index%` / `%total%` tokens (never ICU) - next-intl passes those through verbatim
 * and this component substitutes the numbers itself, keeping the message catalogues
 * out of the client bundle. See `DepartmentCarouselLabels`.
 *
 * DESIGN. One large media item at a time in a fixed 1:1 square frame (no layout
 * shift) - the ratio that crops this site's mixed portrait/landscape media least.
 * Only the active slide exists in the DOM, so untouched media is never downloaded -
 * the first image loads eagerly (LCP), later ones load lazily exactly when the
 * visitor reaches them, and videos outside the current slide have no element at all.
 * Transitions are a restrained 500ms fade, disabled entirely under
 * `prefers-reduced-motion`.
 *
 * VIDEO. Muted, `playsInline`, `loop`, `preload="metadata"`, no native controls,
 * and a poster image when the row has one. Autoplay only happens when browser
 * policy AND the visitor's motion preference allow it: under
 * `prefers-reduced-motion: reduce` the video starts paused and a small play/pause
 * control in the bar offers manual playback. Only the active slide is mounted, so
 * at most one video exists - changing slides unmounts the previous one, which
 * pauses and resets it.
 *
 * INTERACTION. Previous/next buttons, a video play/pause toggle, swipe
 * (direction-aware in RTL), the arrow keys while a control has focus, and a compact
 * dot track plus a `01 / 05` counter in a bar BELOW the frame - nothing is overlaid
 * on the media.
 *
 * FAILURE. A slide whose media fails to load is quietly dropped from rotation; if
 * every slide fails the component renders nothing rather than a broken widget. A
 * single image renders with no controls at all; a lone video keeps its play/pause
 * toggle. Zero media means the page does not mount it.
 */

/** Fully-prepared labels. `slideLabel` and `goToMedia` may contain `%index%` and
 * `%total%` tokens, which this component replaces at render time. */
export interface DepartmentCarouselLabels {
  readonly regionLabel: string;
  readonly previousMedia: string;
  readonly nextMedia: string;
  readonly slideLabel: string;
  readonly goToMedia: string;
  readonly playVideo: string;
  readonly pauseVideo: string;
}

interface DepartmentCarouselProps {
  readonly media: readonly PublicSectionMedia[];
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

function subscribeReducedMotion(onStoreChange: () => void): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function getReducedMotionValue(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// On the server there is no matchMedia; the static shell is treated as full motion,
// and the client corrects the value on hydration.
function getReducedMotionServerSnapshot(): boolean {
  return false;
}

export function DepartmentCarousel({
  media,
  departmentName,
  locale,
  labels,
}: DepartmentCarouselProps) {
  const isRtl = getDirection(locale) === "rtl";

  // Deliberately not a `useReducer`-free ref of animations: the single-source state
  // is the slide index, and everything else derives from it.
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [playingByMedia, setPlayingByMedia] = useState<Readonly<Record<string, boolean>>>({});
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const drag = useRef<{ startX: number; startY: number; axis: "x" | "y" | null }>({
    startX: 0,
    startY: 0,
    axis: null,
  });

  // Autoplay is a behaviour the visitor controls. Reduced-motion users are handed a
  // static poster/first frame and manual play/pause instead of a moving slide.
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionValue,
    getReducedMotionServerSnapshot,
  );

  const available = useMemo(() => media.filter((item) => !failed.has(item.id)), [media, failed]);

  const total = available.length;
  const current = Math.min(index, total - 1);
  const currentMedia = available[current];

  if (total === 0 || !currentMedia) {
    return null;
  }

  const goTo = (target: number) => setIndex(((target % total) + total) % total);
  const previous = () => goTo(current - 1);
  const next = () => goTo(current + 1);

  const markFailed = (id: string) => {
    setFailed((previousSet) => (previousSet.has(id) ? previousSet : new Set(previousSet).add(id)));
  };

  const toggleVideoPlayback = () => {
    const element = videoRef.current;
    if (!element) return;
    if (element.paused) {
      void element
        .play()
        .catch(() => setPlayingByMedia((prev) => ({ ...prev, [currentMedia.id]: false })));
    } else {
      element.pause();
    }
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
    // brings the next slide in - the same physical metaphor, not transposed icons.
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

  const slideLabel = interpolate(labels.slideLabel, { index: current + 1, total });

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
  const playIcon = (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={styles.controlIcon}
    >
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
  const pauseIcon = (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={styles.controlIcon}
    >
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
    </svg>
  );

  const isVideo = currentMedia.mediaType === "video";
  // Playing state is tracked per media id, so switching slides never leaves a stale
  // "playing" flag behind - the freshly mounted video simply starts unset.
  const videoPlaying = isVideo && playingByMedia[currentMedia.id] === true;
  // A lone video still needs its play/pause toggle; a lone image needs nothing.
  const showControls = isVideo || total > 1;

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
          aria-label={slideLabel}
        >
          {isVideo ? (
            <video
              key={currentMedia.id}
              // Only the active slide is mounted, so this is the only video in the
              // document. Muted autoplay is allowed without a gesture; when the
              // browser still blocks it, the poster (or first frame) stays visible
              // and the toggle below offers manual playback.
              ref={videoRef}
              src={currentMedia.mediaUrl}
              poster={currentMedia.posterUrl ?? undefined}
              muted
              loop
              playsInline
              preload="metadata"
              autoPlay={!reducedMotion}
              onPlay={() => setPlayingByMedia((prev) => ({ ...prev, [currentMedia.id]: true }))}
              onPause={() => setPlayingByMedia((prev) => ({ ...prev, [currentMedia.id]: false }))}
              onError={() => markFailed(currentMedia.id)}
              aria-label={currentMedia.altText ?? departmentName}
              className={styles.video}
            />
          ) : (
            <Image
              key={currentMedia.id}
              src={currentMedia.mediaUrl}
              // `alt_text` is the meaningful description when present; otherwise the
              // department's own name carries the same precedent `DepartmentCard`
              // already sets. Never an invented caption, never empty for a
              // content-bearing image.
              alt={currentMedia.altText ?? departmentName}
              fill
              sizes="(min-width: 1024px) 56rem, (min-width: 768px) calc(100vw - 4rem), calc(100vw - 2.5rem)"
              loading={current === 0 ? "eager" : "lazy"}
              fetchPriority={current === 0 ? "high" : "auto"}
              onError={() => markFailed(currentMedia.id)}
              className={styles.image}
            />
          )}
        </div>
      </div>

      {showControls ? (
        <div className={styles.controls} onKeyDown={handleKeyDown}>
          {total > 1 ? (
            <button
              type="button"
              className={styles.control}
              aria-label={labels.previousMedia}
              onClick={previous}
            >
              {chevronStart}
            </button>
          ) : null}

          {isVideo ? (
            <button
              type="button"
              className={styles.control}
              aria-label={videoPlaying ? labels.pauseVideo : labels.playVideo}
              aria-pressed={videoPlaying}
              onClick={toggleVideoPlayback}
            >
              {videoPlaying ? pauseIcon : playIcon}
            </button>
          ) : null}

          {total > 1 ? (
            <>
              <div className={styles.dots}>
                {available.map((item, position) => (
                  <button
                    key={item.id}
                    type="button"
                    className={position === current ? styles.dotActive : styles.dot}
                    aria-label={interpolate(labels.goToMedia, { index: position + 1 })}
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
                aria-label={labels.nextMedia}
                onClick={next}
              >
                {chevronEnd}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
