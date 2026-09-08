import "server-only";

import { redirect } from "next/navigation";

import { ADMIN_ROLE } from "@/lib/constants/admin";
import { getSupabaseAuthClient } from "@/lib/supabase/server";

/**
 * Server-side authorization for the dashboard.
 *
 * TWO INDEPENDENT CHECKS, in order:
 *
 *   1. `getClaims()` verifies the access token's signature. Not `getSession()`, which
 *      decodes the cookie without validating it and would accept a forged one.
 *   2. `public.profiles.role` decides whether that verified identity may enter. The
 *      database is the authority. The role is never mirrored into a cookie, into
 *      `localStorage`, into JWT metadata, or into a list of addresses in this
 *      repository, because every one of those can be edited by the person being
 *      checked, or drift out of step with the row that actually governs access.
 *
 * The query runs through the authenticated client, so RLS on `profiles` applies. A
 * policy that hides other people's rows is therefore an additional barrier rather
 * than something this code has to reimplement - `eq("id", sub)` narrows to the
 * caller's own row, and RLS independently confirms they may read it.
 *
 * The proxy has already established that a session exists before a render reaches
 * here. This is not redundant: the proxy deliberately performs no role check, and a
 * role revoked mid-session must take effect on the next request rather than whenever
 * the token happens to expire.
 *
 * Both failure modes redirect to the login page and neither says why. The visitor
 * learns only that they cannot proceed, which is all they need and all they should be
 * told - distinguishing "not signed in" from "signed in but not an admin" would
 * confirm that a valid account exists.
 */

export interface AdminIdentity {
  /** `auth.uid()` of the signed-in admin. */
  readonly id: string;
  /** From the verified token. Absent if the account has no email identity. */
  readonly email: string | null;
}

/** Reason codes surfaced on the login page. Deliberately coarse. */
export const LOGIN_NOTICE = {
  /** Signed in, but `profiles.role` does not grant access. */
  denied: "denied",
  /** Session ended, either by the visitor or because it could not be verified. */
  signedOut: "signed-out",
  /** A password change rotated the credentials and the session was discarded. */
  passwordChanged: "password-changed",
} as const;

export async function requireAdmin(): Promise<AdminIdentity> {
  const supabase = await getSupabaseAuthClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const sub = claimsData?.claims?.sub;

  if (claimsError || typeof sub !== "string" || sub.length === 0) {
    redirect("/admin/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", sub)
    .maybeSingle();

  if (profileError) {
    // A failed authorization lookup is not an authorization pass. Logged in full
    // server-side; the visitor sees only the generic notice.
    console.error(`[auth] profiles lookup failed for ${sub}: ${profileError.message}`, {
      code: profileError.code,
      details: profileError.details,
      hint: profileError.hint,
    });
    redirect(`/admin/login?notice=${LOGIN_NOTICE.denied}`);
  }

  if (profile?.role !== ADMIN_ROLE) {
    redirect(`/admin/login?notice=${LOGIN_NOTICE.denied}`);
  }

  const email = claimsData?.claims?.email;

  return {
    id: sub,
    email: typeof email === "string" && email.length > 0 ? email : null,
  };
}
