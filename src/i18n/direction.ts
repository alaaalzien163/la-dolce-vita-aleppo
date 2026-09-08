import type { Locale } from "next-intl";

export type Direction = "ltr" | "rtl";

/**
 * Writing direction per locale.
 *
 * Typed as an exhaustive `Record<Locale, Direction>`: adding a locale to
 * `routing.ts` without mapping its direction here fails `npm run typecheck`.
 * A static map is preferred over runtime `Intl` introspection - it costs
 * nothing at request time and is verifiable by the compiler.
 */
const LOCALE_DIRECTION: Record<Locale, Direction> = {
  ar: "rtl",
  en: "ltr",
};

export function getDirection(locale: Locale): Direction {
  return LOCALE_DIRECTION[locale];
}
