import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type ContainerWidth = "measure" | "content" | "wide";

const WIDTH_CLASS: Record<ContainerWidth, string> = {
  measure: "max-w-measure",
  content: "max-w-content",
  wide: "max-w-wide",
};

interface ContainerProps {
  /** Element to render. Defaults to `div` so it never affects the document outline. */
  readonly as?: ElementType;
  readonly width?: ContainerWidth;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Horizontal layout constraint: max width plus the responsive gutter.
 *
 * `px-gutter` is inline padding, so it mirrors automatically between LTR and
 * RTL. `w-full` with `mx-auto` never produces a fixed width, which is what keeps
 * a 320px viewport free of horizontal scrolling.
 */
export function Container({
  as: Tag = "div",
  width = "content",
  className,
  children,
}: ContainerProps) {
  return (
    <Tag className={cn("mx-auto w-full px-gutter md:px-gutter-lg", WIDTH_CLASS[width], className)}>
      {children}
    </Tag>
  );
}
