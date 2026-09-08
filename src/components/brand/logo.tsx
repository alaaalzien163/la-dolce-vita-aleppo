import Image from "next/image";

import { cn } from "@/lib/utils/cn";

/**
 * The official La Dolce Vita logo.
 *
 * Source: `public/logo.png`, 2365 x 794 (2.9786:1), 8-bit RGBA, non-interlaced.
 * Those are the file's real intrinsic dimensions, read from its IHDR chunk, and they
 * are passed to `next/image` unmodified so the generated `srcset` and the reserved
 * layout box both match the asset. Display height is set in CSS with `w-auto`, so
 * the aspect ratio is never overridden and the mark cannot be stretched.
 *
 * THE ARTWORK IS A SINGLE COLOUR: brand olive `#3F4123` on transparency, verified by
 * decoding the file - 100% of its visible pixels are that one value. That dictates
 * where the image can and cannot be used:
 *
 *   on cream `#E7DDC8`   7.82:1   the header, and any light surface
 *   on olive `#3F4123`   1.00:1   invisible
 *
 * So `tone="inverse"` does not render the image. Recolouring the artwork is not
 * permitted, and a CSS filter would be exactly that, so dark surfaces fall back to
 * the site name in the display face. Supplying a light/reversed export of the mark
 * would let the image be used there too; until one exists, type is the honest option.
 */

/**
 * Intrinsic pixel dimensions of `public/logo.png`, read from its IHDR chunk. The
 * authoritative record of the source aspect ratio; every rendered size is derived
 * from it rather than typed by hand.
 */
const INTRINSIC = {
  src: "/logo.png",
  width: 2365,
  height: 794,
} as const;

/**
 * Rendered heights in CSS pixels.
 *
 * `next/image` treats `width`/`height` as the layout box, and derives its `srcset`
 * breakpoints from it. Passing the intrinsic 2365 x 794 would declare a 2365px-wide
 * box for a mark displayed at roughly 107px, and the optimizer would dutifully serve
 * the 3840px variant - a 31 KB download for a header logo. So the layout box is the
 * rendered size, computed from the intrinsic ratio so the proportions are exact.
 */
const RENDERED_HEIGHT = {
  sm: 28,
  md: 36,
  lg: 48,
} as const;

/** Width that preserves the source ratio exactly at a given rendered height. */
function widthFor(height: number): number {
  return Math.round((height * INTRINSIC.width) / INTRINSIC.height);
}

/** Wordmark scale, matched to the optical height of the image at each size. */
const WORDMARK_CLASS = {
  sm: "text-base",
  md: "text-lg sm:text-xl",
  lg: "text-2xl sm:text-3xl",
} as const;

export type LogoSize = keyof typeof RENDERED_HEIGHT;
export type LogoTone = "default" | "inverse";

interface LogoProps {
  /**
   * Localized accessible name, normally `common.siteName`.
   *
   * Used as the image's `alt`, which means a link wrapping this component takes its
   * accessible name from here and needs no `aria-label` of its own.
   */
  readonly label: string;
  readonly size?: LogoSize;
  /** `"inverse"` on dark surfaces, where the olive artwork would be invisible. */
  readonly tone?: LogoTone;
  /** `alt=""` for when an ancestor already supplies the same name. */
  readonly decorative?: boolean;
  readonly className?: string;
  /** Set on the header instance: it is above the fold on every page. */
  readonly priority?: boolean;
}

export function Logo({
  label,
  size = "md",
  tone = "default",
  decorative = false,
  className,
  priority = false,
}: LogoProps) {
  if (tone === "inverse") {
    return (
      <span
        aria-hidden={decorative ? true : undefined}
        className={cn(
          "font-display font-medium tracking-display whitespace-nowrap text-foreground-inverse",
          WORDMARK_CLASS[size],
          className,
        )}
      >
        {label}
      </span>
    );
  }

  const height = RENDERED_HEIGHT[size];

  return (
    <Image
      src={INTRINSIC.src}
      // Layout box, derived from the intrinsic ratio - never a guessed pair.
      width={widthFor(height)}
      height={height}
      alt={decorative ? "" : label}
      priority={priority}
      className={cn("ldv-logo-mark h-auto w-auto object-contain", className)}
    />
  );
}
