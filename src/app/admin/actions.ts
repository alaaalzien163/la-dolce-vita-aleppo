"use server";

import { redirect } from "next/navigation";

import { ADMIN_ROLE } from "@/lib/constants/admin";
import { getSupabaseAuthClient } from "@/lib/supabase/server";

/**
 * Sign-in and sign-out for the dashboard.
 *
 * WHY THESE ARE SERVER ACTIONS RATHER THAN BROWSER CALLS. Signing in and deciding
 * whether the account may enter have to be one indivisible step. Done in the browser,
 * `signInWithPassword` hands back a valid session before anything has consulted
 * `profiles.role`, leaving a window in which a non-admin holds working credentials for
 * the site. Here the role check happens in the same round trip, and an account that
 * fails it is signed out before the response is written - so no usable session ever
 * reaches the client.
 *
 * The password is read from `FormData` and passed straight to Supabase. It is never
 * logged, never stored, never echoed back into the form, and never placed in a URL.
 *
 * Everything the visitor is told is generic. "Wrong password", "no such account", and
 * "account exists but is not an admin" all produce the same message, so the form
 * cannot be used to discover which addresses are registered.
 */

/** Discriminated result, so the form can render an error without a thrown exception. */
export type SignInState =
  | { readonly status: "idle" }
  | { readonly status: "error"; readonly reason: "credentials" | "denied" | "unexpected" };

export async function signInAdmin(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return { status: "error", reason: "credentials" };
  }

  const supabase = await getSupabaseAuthClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user) {
    // Logged server-side with the provider's own wording; the visitor gets none of it.
    console.warn(`[auth] sign-in rejected: ${error?.message ?? "no user returned"}`);
    return { status: "error", reason: "credentials" };
  }

  // Authenticated. Now the separate question of authorization, answered by the
  // database through the session that was just established, so RLS applies.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    console.error(`[auth] profiles lookup failed for ${data.user.id}: ${profileError.message}`, {
      code: profileError.code,
      details: profileError.details,
      hint: profileError.hint,
    });
    await supabase.auth.signOut();
    return { status: "error", reason: "unexpected" };
  }

  if (profile?.role !== ADMIN_ROLE) {
    // Correct credentials, insufficient authority. The session is discarded rather
    // than left in place, so a rejected account is not carrying a live token around.
    console.warn(`[auth] non-admin sign-in denied for ${data.user.id}`);
    await supabase.auth.signOut();
    return { status: "error", reason: "denied" };
  }

  // `redirect` throws to unwind, so it must sit outside any try/catch above it.
  redirect("/admin");
}

export async function signOutAdmin(): Promise<void> {
  const supabase = await getSupabaseAuthClient();

  // `scope: "local"` clears this browser's session only. A global sign-out would
  // revoke every other device too, which is not what a logout button implies.
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    console.error(`[auth] sign-out failed: ${error.message}`);
  }

  redirect("/admin/login?notice=signed-out");
}
