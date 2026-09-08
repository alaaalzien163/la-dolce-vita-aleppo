import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type SectionHeadingLevel = 1 | 2 | 3;
export type SectionHeadingAlign = "start" | "center";
export type SectionHeadingTone = "default" | "inverse";

interface SectionHeadingProps {
  /** Referenced by the parent `Section`'s `aria-labelledby`. */
  readonly id?: string;
  /** Small all-caps label above the title. Decorative gold rule is added automatically. */
  readonly eyebrow?: string;
  /** `ReactNode` so callers can attach `dir="auto"` to database text (Arabic on a
      LTR page) without sacrificing the shared markup. */
  readonly title: ReactNode;
  readonly description?: ReactNode;
  /**
   * `2` for a homepage band, `3` for a nested group. `1` is the page title of a
   * dedicated public page (Departments or Menu) - exactly one per document,
   * and never on the homepage, where the hero owns the `h1`. Never skips a level.
   */
  readonly level?: SectionHeadingLevel;
  readonly align?: SectionHeadingAlign;
  readonly tone?: SectionHeadingTone;
  readonly className?: string;
}

/**
 * The single place section headings are composed, so hierarchy and rhythm cannot
 * drift between sections.
 *
 * Homepage bands render `h2`; nested groups `h3`. A dedicated page may pass
 * `level={1}` for its one page title (there is no hero on those pages), which is
 * the only context a first-level heading is legitimate here.
 *
 * Gold is used for the eyebrow rule and never for the text itself - gold on
 * cream is 1.54:1. The eyebrow text uses `accent-ink` (4.64:1) so a gold-toned
 * label still passes AA.
 */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  level = 2,
  align = "start",
  tone = "default",
  className,
}: SectionHeadingProps) {
  const Heading = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
  const isInverse = tone === "inverse";

  return (
    <div
      className={cn(
        "flex flex-col",
        align === "center" ? "items-center text-center" : "items-start text-start",
        className,
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            "flex items-center gap-3 text-eyebrow font-semibold tracking-eyebrow uppercase",
            isInverse ? "text-accent" : "text-accent-ink",
          )}
        >
          <span
            aria-hidden="true"
            className={cn("h-px w-8", isInverse ? "bg-accent" : "bg-accent-line")}
          />
          {eyebrow}
        </p>
      ) : null}

      <Heading
        id={id}
        className={cn(
          eyebrow ? "mt-4" : undefined,
          level === 1 ? "text-display-lg" : level === 2 ? "text-display-md" : "text-display-sm",
          "font-medium",
          isInverse ? "text-foreground-inverse" : "text-heading",
        )}
      >
        {title}
      </Heading>

      {description ? (
        <p
          className={cn(
            "mt-4 max-w-measure text-base",
            isInverse ? "text-foreground-inverse-muted" : "text-foreground-muted",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
