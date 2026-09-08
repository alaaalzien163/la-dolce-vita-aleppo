import { cn } from "@/lib/utils/cn";

export type DecorativeVideoTone = "warm" | "deep";

interface DecorativeVideoProps {
  readonly src: string;
  /** Aspect-ratio utilities, e.g. `aspect-[4/3] sm:aspect-[16/10]`. */
  readonly className?: string;
  readonly tone?: DecorativeVideoTone;
}

/**
 * Decorative autoplaying video inside a fixed media box.
 *
 * The box owns the same reserved surface as the photography it can accompany:
 * `EditorialPanel`'s rounded panel, border, tonal gradient, and inset gold
 * hairline. The gradient sits *behind* the video so there is never a black
 * flash while the first frame loads; the hairline sits *above* it as a static
 * frame rather than a filter, so the video and the section around it read as
 * one surface in both themes.
 *
 * The video is purely decorative, so it is hidden from assistive technology and
 * never focusable - no controls, no captions. Inventing a description for
 * decoration would be accessibility noise, not an improvement.
 *
 * The `.autoplay-video` class hides the element under
 * `prefers-reduced-motion: reduce` (see `globals.css`), leaving the static
 * underlay as the reduced-motion presentation and stopping the download for
 * those visitors. No `poster` is supplied: generating one would need an encode
 * of the source media, and the underlay already covers every pause in loading.
 */
export function DecorativeVideo({ src, className, tone = "warm" }: DecorativeVideoProps) {
  const isDeep = tone === "deep";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-panel border",
        isDeep ? "border-banner-900 bg-banner-800" : "border-border bg-surface-muted",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-gradient-to-br",
          isDeep ? "from-banner-600 via-banner-700 to-banner-900" : "from-cream-200 to-cream-300",
        )}
      />

      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="autoplay-video absolute inset-0 h-full w-full object-cover"
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Gold hairline frame on top of the video; `pointer-events-none` keeps it
          from ever intercepting a click meant for the page. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-6 border sm:inset-8",
          isDeep ? "border-accent/35" : "border-accent-line/35",
        )}
      />
    </div>
  );
}
