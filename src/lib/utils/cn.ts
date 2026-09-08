import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names and resolves Tailwind conflicts.
 *
 * Primitives compose their own classes first and append the caller's
 * `className` last, so a consumer can override a default (`p-0` beating `p-6`)
 * without the primitive growing a prop for every possibility.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
