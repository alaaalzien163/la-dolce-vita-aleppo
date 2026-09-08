"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";

/**
 * Browser Supabase client, for Client Components only.
 *
 * Reads and writes the same cookies the server client uses, so a session
 * established by a Server Action is visible here without any handover step, and a
 * token refreshed on either side is seen by the other.
 *
 * SCOPE. Authentication itself does not go through this client. Sign-in and
 * sign-out are Server Actions, because the authorization decision that follows
 * sign-in - reading `profiles.role` - must happen where it cannot be tampered with,
 * and because a rejected non-admin has to be signed out in the same round trip.
 * Routing that through the browser would put a valid session in the visitor's hands
 * before anything had checked whether they were allowed one.
 *
 * What this client is for is client-side reads inside the dashboard once CRUD
 * arrives: subscriptions, optimistic updates, and anything that needs the session
 * in the browser. It is deliberately not used on the public site, which is
 * anonymous, static, and served without any Supabase JavaScript at all.
 *
 * `createBrowserClient` memoises internally, so calling this repeatedly does not
 * create competing clients or duplicate refresh timers.
 */
export function createSupabaseBrowserClient() {
  // Read as literal static property accesses: `NEXT_PUBLIC_*` values are
  // substituted at build time, and a dynamic lookup is not replaced, so it would
  // arrive as `undefined` in the browser.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set at build time.",
    );
  }

  return createBrowserClient<Database>(url, key);
}
