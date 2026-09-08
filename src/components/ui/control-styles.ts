import { cn } from "@/lib/utils/cn";

/**
 * Shared skin for text controls, so `Input` and `Textarea` cannot drift apart.
 *
 * `border-border-strong` is olive-500, which reaches 3.50:1 against cream and
 * 4.44:1 against the raised surface - above the 3:1 minimum for the boundary of
 * a form control. A hairline in `--color-border` would have been 1.45:1 and is
 * therefore reserved for decorative dividers.
 *
 * Invalid state is driven by `aria-invalid` rather than a prop, so the visual
 * and the accessible state can never disagree.
 */
export function controlStyles(className?: string): string {
  return cn(
    "block w-full rounded-control border bg-input px-3.5 py-2.5 text-base",
    "border-input-border text-foreground",
    "placeholder:text-input-placeholder/70",
    "transition-[border-color] duration-150 ease-out",
    "hover:border-border-strong",
    "disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60",
    "aria-[invalid=true]:border-error",
    className,
  );
}
