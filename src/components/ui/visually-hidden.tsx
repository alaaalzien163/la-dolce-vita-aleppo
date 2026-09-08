import type { ReactNode } from "react";

interface VisuallyHiddenProps {
  readonly as?: "span" | "div" | "h1" | "h2";
  readonly children: ReactNode;
}

/**
 * Removes content from the visual layer while leaving it in the accessibility
 * tree. Use for text a screen reader needs but the design does not show - never
 * to hide content from everyone (that is `hidden`).
 *
 * `sr-only` is Tailwind's built-in implementation of the clip-rect technique; it
 * keeps the node focusable and readable, unlike `display: none`.
 */
export function VisuallyHidden({ as: Tag = "span", children }: VisuallyHiddenProps) {
  return <Tag className="sr-only">{children}</Tag>;
}
