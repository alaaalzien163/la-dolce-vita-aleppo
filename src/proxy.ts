import { hasLocale } from "next-intl";
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import { applySessionCookies, refreshSupabaseSession } from "@/lib/supabase/proxy";

/**
 * Request boundary for two separate concerns: locale negotiation for the public
 * site, and Supabase session handling for the dashboard.
 *
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`; the old filename still works but
 * is deprecated, so this project stays on the new one. There is deliberately no
 * `middleware.ts`.
 *
 * THE TWO BRANCHES DO NOT OVERLAP, and that is the point.
 *
 * `/admin/*` is not locale-prefixed. next-intl runs with `localePrefix: "always"`, so
 * handing it `/admin` would rewrite it to `/ar/admin` and the route would not exist.
 * Admin paths therefore skip the intl middleware entirely and get Supabase treatment
 * instead. The dashboard is still translated - it resolves its locale from the
 * `NEXT_LOCALE` cookie that next-intl already maintains, so one language preference
 * covers both halves of the site without a second routing scheme.
 *
 * Public routes skip Supabase just as completely. Refreshing a session on every
 * anonymous page view would cost a token check per request and buy nothing: the
 * public site renders no signed-in state. An admin browsing the public pages simply
 * has their session refreshed the moment they return to `/admin`, which the
 * long-lived refresh token makes seamless.
 *
 * WHAT THE ADMIN BRANCH GUARANTEES:
 *   - the access token is refreshed before any page renders
 *   - claims are verified by signature, not merely decoded
 *   - an unauthenticated request never reaches the dashboard
 *   - responses are marked private and uncacheable
 *
 * WHAT IT DELIBERATELY DOES NOT DO: check whether the user is an admin. That needs a
 * `profiles` query, and putting a database round trip in the proxy would tax every
 * asset and sub-request on the path. It also risks a redirect loop if the check and
 * the page ever disagree. Role authorization belongs in `requireAdmin()`, which runs
 * once per render with the same authenticated client. The proxy answers "is there a
 * valid session"; the page answers "is this session allowed here".
 */

const intlMiddleware = createMiddleware(routing);

const ADMIN_ROOT = "/admin";
const ADMIN_LOGIN = "/admin/login";
const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

/**
 * Admin modules that no longer exist.
 *
 * These paths must resolve through Next.js' normal not-found handling rather than
 * being intercepted by the auth redirect. Without this check an unauthenticated
 * request to a removed module would misleadingly look like a valid protected
 * route until after sign-in.
 */
const RETIRED_ADMIN_ROOTS = new Set(["/admin/gallery"]);

/** Authenticated responses must never be stored by a shared or private cache. */
function markPrivate(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  return response;
}

function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_ROOT || pathname.startsWith(`${ADMIN_ROOT}/`);
}

function isRetiredAdminPath(pathname: string): boolean {
  for (const root of RETIRED_ADMIN_ROOTS) {
    if (pathname === root || pathname.startsWith(`${root}/`)) {
      return true;
    }
  }

  return false;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isAdminPath(pathname)) {
    if (pathname === "/") {
      const preferredLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
      const locale = hasLocale(routing.locales, preferredLocale)
        ? preferredLocale
        : routing.defaultLocale;
      const response = NextResponse.redirect(new URL(`/${locale}`, request.url));

      // Establish English as the initial preference, without overwriting a valid
      // language previously selected by the visitor.
      if (preferredLocale !== locale) {
        response.cookies.set(LOCALE_COOKIE_NAME, locale, {
          path: "/",
          maxAge: 31_536_000,
          sameSite: "lax",
        });
      }

      return response;
    }

    return intlMiddleware(request);
  }

  if (isRetiredAdminPath(pathname)) {
    return NextResponse.next({ request });
  }

  const { claims, cookies } = await refreshSupabaseSession(request);
  const onLoginPage = pathname === ADMIN_LOGIN;

  if (!claims && !onLoginPage) {
    const redirectUrl = new URL(ADMIN_LOGIN, request.url);
    return markPrivate(applySessionCookies(NextResponse.redirect(redirectUrl), cookies));
  }

  // An authenticated visitor is not bounced off the login page. Doing so would loop
  // for a signed-in non-admin: login sends them to the dashboard, the dashboard
  // rejects them and sends them back. Letting the page render keeps the exit
  // available - they can sign in as someone else.
  return markPrivate(applySessionCookies(NextResponse.next({ request }), cookies));
}

export const config = {
  // Skip API routes, Next.js internals, Vercel internals, and any path containing a
  // dot (static files such as `logo.png` or `robots.txt`).
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
