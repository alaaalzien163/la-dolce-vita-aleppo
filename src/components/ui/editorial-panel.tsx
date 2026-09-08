import { cn } from "@/lib/utils/cn";

/**
 * Abstract editorial panel used where photography has not been supplied.
 *
 * No stock imagery and no invented photograph: this is built from the design
 * system's own surfaces and gold hairlines, so an unfinished page still reads as
 * deliberate rather than broken. Purely decorative, so it is hidden from assistive
 * technology - there is nothing here to describe.
 *
 * Replace with `next/image` once real photography exists. The aspect ratio is set
 * by the caller, so swapping the contents will not move the surrounding layout.
 */

export type EditorialPanelTone = "warm" | "deep";

interface EditorialPanelProps {
  readonly tone?: EditorialPanelTone;
  /** Aspect-ratio utility, e.g. `aspect-[4/5]`. */
  readonly className?: string;
}

export function EditorialPanel({ tone = "warm", className }: EditorialPanelProps) {
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
      {/* Off-centre wash, warmer towards the inline-start edge. `to-bl`/`to-br` are
          physical, but the gradient is symmetrical enough that direction reads the
          same either way, and it carries no meaning. The deep tone rides the banner
          ramp so the panel and the Hero band around it read as one surface. */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br",
          isDeep ? "from-banner-600 via-banner-700 to-banner-900" : "from-cream-200 to-cream-300",
        )}
      />

      {/* Gold hairline frame, inset. Uses logical insets so it mirrors with the
          writing direction. */}
      <div
        className={cn(
          "absolute inset-6 border sm:inset-8",
          isDeep ? "border-accent/35" : "border-accent-line/35",
        )}
      />

      {/* Two thin rules meeting off-centre - an editorial device, not a monogram. */}
      <div
        className={cn(
          "absolute inset-y-0 start-1/3 w-px",
          isDeep ? "bg-accent/20" : "bg-accent-line/20",
        )}
      />
      <div
        className={cn(
          "absolute inset-x-0 top-2/3 h-px",
          isDeep ? "bg-accent/20" : "bg-accent-line/20",
        )}
      />
    </div>
  );
}
