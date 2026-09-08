import type ar from "../../messages/ar.json";
import type { routing } from "@/i18n/routing";

/**
 * Strict typing for next-intl.
 *
 * - `Locale` is derived from `routing.locales`, so an unsupported locale string
 *   is a compile error rather than a runtime 404.
 * - `Messages` is derived from the default-locale catalog, which makes every
 *   `t("...")` key checked at build time.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof ar;
  }
}
