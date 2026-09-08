import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Server-side Supabase client for public, read-only data.
 *
 * `import "server-only"` makes any accidental import from a Client Component a
 * build error rather than a runtime leak. Nothing secret passes through here -
 * the publishable key is public by design - but the guard keeps the data layer
 * from drifting into the browser, which is what would introduce client-side
 * database fetching.
 *
 * Why not `@supabase/ssr` here: that package exists to synchronise auth session
 * cookies, and reading cookies opts a route out of static generation. This client
 * serves `/ar` and `/en`, which are prerendered. Routing the public data layer
 * through the authenticated client would turn both pages dynamic and add a session
 * lookup to every anonymous visit, in exchange for nothing - the public site has no
 * signed-in state to show. The two clients are separate on purpose; see
 * `getSupabaseAuthClient` below.
 *
 * Session handling is switched off explicitly. On the server there is no storage
 * to persist to and no user to refresh; leaving the defaults on would start a
 * refresh timer per client instance.
 *
 * Wrapped in React `cache()` so one request reuses a single instance. Creating a
 * Supabase client is cheap - it mostly configures a `fetch` - but deduplicating
 * keeps behaviour predictable when several data modules run in the same render.
 *
 * Typed with `Database`, so `.from()` and `.select()` are checked against the real
 * schema. That file covers only the tables whose columns have been verified against
 * the live database; querying any other table is a compile error until the types
 * are regenerated. See `src/lib/supabase/database.types.ts`.
 */
export const getSupabaseServerClient = cache((): SupabaseClient<Database> => {
  return createClient<Database>(getSupabaseUrl(), getSupabasePublishableKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-application-name": "la-dolce-vita-web",
      },
    },
  });
});

/**
 * Cookie-aware Supabase client carrying the caller's session.
 *
 * For Server Components, Server Actions, and route handlers under `/admin`. Every
 * request it makes runs as the signed-in user, so RLS applies exactly as it does
 * from the browser - the security boundary stays in the database.
 *
 * COOKIE WRITES ARE BEST-EFFORT ON PURPOSE. A Server Component cannot mutate
 * cookies and Next.js throws if it tries, so `setAll` swallows that failure. This is
 * safe because token refresh is owned by `src/proxy.ts`, which runs before the render
 * on a request/response pair that can legitimately write. Inside a Server Action or
 * route handler the same `setAll` does write, which is how sign-in persists a session
 * and sign-out clears it.
 *
 * Both clients share the one generated `Database` type, so `.from()` and `.select()`
 * are checked against the real schema in either case. What differs is the identity the
 * requests run as, not what they are allowed to describe - RLS decides the rest.
 *
 * Not wrapped in `cache()`: it captures a cookie snapshot, and a Server Action that
 * has just written new session cookies must not be handed an instance still holding
 * the pre-sign-in state.
 */
export async function getSupabaseAuthClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Render context: cookies are read-only here. The proxy already
          // refreshed them, so there is nothing to recover from.
        }
      },
    },
  });
}
