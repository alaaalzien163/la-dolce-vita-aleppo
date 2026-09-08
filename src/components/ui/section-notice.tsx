import { cn } from "@/lib/utils/cn";

/**
 * Neutral notice for a section that has nothing to show.
 *
 * Shared by every section that can be empty, so the three non-populated outcomes -
 * no rows, rows without publishable content, and a failed query - all read the same
 * way instead of each inventing their own treatment.
 *
 * Deliberately quiet: a hairline, generous padding, muted text. An empty state
 * should look like a considered pause, not an error dialogue. The `error` tone adds
 * only a burgundy hairline; it carries no icon and no alarming colour fill, because
 * a visitor can do nothing about a database failure and does not need to be alerted
 * to one.
 *
 * `role="status"` is not used: this is static server-rendered content, not a live
 * update, and announcing it on load would interrupt the page for no reason.
 */

export type SectionNoticeTone = "neutral" | "error";
export type SectionNoticeSize = "md" | "sm";

interface SectionNoticeProps {
  readonly title: string;
  readonly description: string;
  readonly tone?: SectionNoticeTone;
  /** Heading level, chosen so the notice does not skip a level in context. */
  readonly headingLevel?: 2 | 3 | 4;
  /** `sm` for the quiet notices inside a larger section (e.g. one empty menu
      within a populated page) where the full-size padding would dwarf the gap
      it is filling. */
  readonly size?: SectionNoticeSize;
  readonly className?: string;
}

export function SectionNotice({
  title,
  description,
  tone = "neutral",
  headingLevel = 3,
  size = "md",
  className,
}: SectionNoticeProps) {
  const Heading = headingLevel === 2 ? "h2" : headingLevel === 3 ? "h3" : "h4";

  return (
    <div
      className={cn(
        "rounded-card border border-dashed text-center",
        size === "md" ? "px-6 py-10 sm:py-14" : "px-6 py-8",
        tone === "error" ? "border-error/40" : "border-border-strong/45",
        className,
      )}
    >
      <Heading className="text-lg font-medium">{title}</Heading>
      <p className="mx-auto mt-3 max-w-measure text-sm text-foreground-muted">{description}</p>
    </div>
  );
}
