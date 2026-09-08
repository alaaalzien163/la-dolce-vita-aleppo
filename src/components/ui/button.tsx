import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "emphasis" | "banner";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-control font-semibold " +
  "whitespace-nowrap select-none " +
  "transition-[background-color,border-color,color] duration-150 ease-out " +
  "disabled:pointer-events-none disabled:opacity-45";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  // Gold fill, olive label (5.06:1). Hover *lightens* the gold, which raises
  // contrast to 5.89:1 - darkening it would drop below AA at around L 54%.
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-active",
  // Olive fill, cream label (7.82:1).
  secondary: "bg-surface-inverse text-foreground-inverse hover:bg-olive-900 active:bg-olive-900",
  // Hairline olive border (3.50:1 on cream, meets the non-text minimum).
  outline:
    "border border-border-strong bg-transparent text-foreground hover:bg-surface-muted active:bg-border",
  ghost: "bg-transparent text-foreground hover:bg-surface-muted active:bg-border",
  // Burgundy fill, cream label (11.23:1). Reserved for one high-intent action
  // per page - the palette direction explicitly limits burgundy.
  emphasis:
    "bg-emphasis text-emphasis-foreground hover:bg-emphasis-hover active:bg-emphasis-active",
  // On the burgundy banner: gold hairline (5.89:1, meets the non-text minimum),
  // cream label (9.09:1). Olive text would be unreadable here (1.16:1), so this
  // is the banner-safe counterpart to `outline`.
  banner:
    "border border-accent bg-transparent text-banner-foreground " +
    "hover:bg-banner-foreground/10 active:bg-banner-foreground/20",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

interface ButtonStyleOptions {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly className?: string;
}

/**
 * Exported separately so an anchor or a `Link` can wear the same skin without
 * this file needing to know about routing or `asChild` indirection.
 */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleOptions = {}): string {
  return cn(BASE, VARIANT_CLASS[variant], SIZE_CLASS[size], className);
}

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly className?: string;
}

/**
 * Native `<button>`. No client JavaScript, so it is usable from Server
 * Components; keyboard behaviour, `disabled`, and activation semantics come from
 * the platform rather than being re-implemented.
 *
 * The focus ring is global (`:focus-visible` in `globals.css`) and relies on
 * `outline-offset`, so it stays visible on gold, olive, and burgundy fills
 * alike. `type` defaults to `"button"` so a button inside a form cannot submit
 * it by accident.
 */
export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />;
}
