import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { Container, type ContainerWidth } from "./container";

export type SectionSurface = "default" | "muted" | "raised" | "inverse" | "banner";
export type SectionSpacing = "none" | "default" | "lg";

const SURFACE_CLASS: Record<SectionSurface, string> = {
  default: "bg-background text-foreground",
  muted: "bg-surface-muted text-foreground",
  raised: "bg-surface text-foreground",
  inverse: "bg-surface-inverse text-foreground-inverse",
  banner: "bg-banner-surface text-banner-foreground",
};

const SPACING_CLASS: Record<SectionSpacing, string> = {
  none: "",
  default: "py-section",
  lg: "py-section-lg",
};

interface SectionProps {
  /** Stable anchor id. Use the values from `@/lib/constants/sections`. */
  readonly id?: string;
  readonly as?: "section" | "div" | "header" | "footer";
  readonly surface?: SectionSurface;
  readonly spacing?: SectionSpacing;
  readonly width?: ContainerWidth;
  /** Id of the heading that names this section, for `aria-labelledby`. */
  readonly labelledBy?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Vertical rhythm and surface for one band of the page.
 *
 * - `data-surface` drives the focus-ring flip declared in `globals.css`, so a
 *   control on a dark band (`inverse` olive or `banner` burgundy) gets a cream
 *   ring instead of an invisible olive one.
 * - `scroll-mt-24` offsets in the block direction, which is unaffected by
 *   writing direction, so anchored sections clear a sticky header in both RTL
 *   and LTR.
 * - `labelledBy` is preferred over `aria-label`: it points at the visible
 *   heading rather than duplicating it as an invisible string.
 */
export function Section({
  id,
  as: Tag = "section",
  surface = "default",
  spacing = "default",
  width = "content",
  labelledBy,
  className,
  children,
}: SectionProps) {
  return (
    <Tag
      id={id}
      data-surface={surface}
      aria-labelledby={labelledBy}
      className={cn("scroll-mt-24", SURFACE_CLASS[surface], SPACING_CLASS[spacing], className)}
    >
      <Container width={width}>{children}</Container>
    </Tag>
  );
}
