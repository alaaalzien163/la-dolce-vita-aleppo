import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Locale-aware wrappers around the Next.js navigation APIs.
 *
 * `Link` and `getPathname` are usable from Server Components. `usePathname` and
 * `useRouter` are client-only - importing them into a Server Component resolves
 * to stubs that throw, which is intentional.
 */
export const { Link, redirect, permanentRedirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
