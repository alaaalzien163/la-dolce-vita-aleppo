import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import type { Database } from "@/lib/supabase/database.types";

/**
 * Supabase session handling at the network boundary, for `src/proxy.ts`.
 *
 * Access tokens are short-lived. Something has to exchange the refresh token for a
 * new one and write the result back as cookies, and the proxy is the only place that
 * can: it holds both the incoming request and the outgoing response, so it can
 * mutate cookies, which a Server Component cannot. Without this step a signed-in
 * admin would be logged out roughly every hour.
 *
 * `getClaims()` is what performs the refresh as a side effect, and it is also the
 * authorization primitive. With asymmetric signing keys it verifies the JWT locally
 * against the project's cached JWKS - no network round trip on the common path.
 *
 * WHY NOT `getSession()`. It returns whatever the cookie contains, decoded but
 * unverified. A forged cookie would satisfy it. It is fine for asking "does a session
 * appear to exist", and unfit for deciding "may this request proceed". `getClaims()`
 * validates the signature, so it is what the guard uses.
 */

/** Cookie mutations the Supabase client asked for during this request. */
interface PendingCookie {
  readonly name: string;
  readonly value: string;
  readonly options?: Parameters<NextResponse["cookies"]["set"]>[2];
}

export interface SessionResult {
  /** Verified JWT claims, or `null` when there is no valid session. */
  readonly claims: { readonly sub: string; readonly email?: string } | null;
  /** Refreshed auth cookies, to be applied to whichever response is returned. */
  readonly cookies: readonly PendingCookie[];
}

/**
 * Refreshes the session if needed and returns verified claims.
 *
 * Returns the cookies rather than a response, so the caller stays in control of what
 * it sends. That matters because the proxy sometimes redirects and sometimes hands
 * off to next-intl, and in every case the refreshed cookies have to survive - losing
 * them would silently re-issue a refresh on the next request, or drop the session.
 */
export async function refreshSupabaseSession(request: NextRequest): Promise<SessionResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    // Unconfigured environment: report no session rather than throwing. The guard
    // then denies access, which is the safe direction to fail in.
    return { claims: null, cookies: [] };
  }

  const pending: PendingCookie[] = [];

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          // Update the request copy too, so a later read within this same request
          // sees the refreshed token rather than the expired one.
          request.cookies.set(cookie.name, cookie.value);
          pending.push(cookie);
        }
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return { claims: null, cookies: pending };
  }

  const { sub, email } = data.claims;

  if (typeof sub !== "string" || sub.length === 0) {
    return { claims: null, cookies: pending };
  }

  return {
    claims: { sub, email: typeof email === "string" ? email : undefined },
    cookies: pending,
  };
}

/** Copies refreshed auth cookies onto a response that is about to be returned. */
export function applySessionCookies(
  response: NextResponse,
  cookiesToApply: readonly PendingCookie[],
): NextResponse {
  for (const { name, value, options } of cookiesToApply) {
    response.cookies.set(name, value, options);
  }

  return response;
}
