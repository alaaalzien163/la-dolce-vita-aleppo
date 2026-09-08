import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type CardTone = "default" | "inverse";

interface CardProps {
  readonly as?: ElementType;
  readonly tone?: CardTone;
  /** Adds a hover lift. Only for cards that are themselves a link or button. */
  readonly interactive?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Editorial card: a hairline border, a 4px radius, and one restrained shadow.
 *
 * Deliberately not a dashboard card - no heavy elevation, no large radius, no
 * gradient. Weight comes from typography and generous internal spacing, which is
 * why `CardTitle` uses the display face.
 */
export function Card({
  as: Tag = "div",
  tone = "default",
  interactive = false,
  className,
  children,
}: CardProps) {
  return (
    <Tag
      data-surface={tone === "inverse" ? "inverse" : undefined}
      className={cn(
        "rounded-card border shadow-card",
        tone === "inverse"
          ? "border-border-inverse bg-surface-inverse text-foreground-inverse"
          : "border-border bg-surface text-foreground",
        interactive &&
          "transition-[border-color,box-shadow] duration-200 ease-out hover:border-accent-line hover:shadow-raised",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

interface CardBodyProps {
  readonly className?: string;
  readonly children: ReactNode;
}

export function CardBody({ className, children }: CardBodyProps) {
  return <div className={cn("p-6 sm:p-8", className)}>{children}</div>;
}

interface CardTitleProps {
  /**
   * `2` under a page `h1`, `3` under a section `h2`, `4` when nested one level
   * deeper. Never skips.
   */
  readonly level?: 2 | 3 | 4;
  readonly className?: string;
  readonly children: ReactNode;
}

export function CardTitle({ level = 3, className, children }: CardTitleProps) {
  const Heading = level === 2 ? "h2" : level === 3 ? "h3" : "h4";

  return (
    <Heading
      className={cn(
        "text-xl font-medium text-heading [[data-surface=inverse]_&]:text-foreground-inverse",
        className,
      )}
    >
      {children}
    </Heading>
  );
}

interface CardTextProps {
  readonly className?: string;
  readonly children: ReactNode;
}

export function CardText({ className, children }: CardTextProps) {
  return (
    <p
      className={cn(
        "mt-3 text-sm text-foreground-muted [[data-surface=inverse]_&]:text-foreground-inverse-muted",
        className,
      )}
    >
      {children}
    </p>
  );
}
