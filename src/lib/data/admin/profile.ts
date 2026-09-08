import "server-only";

import { getSupabaseAuthClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/tables";

/**
 * Admin read for the caller's own `public.profiles` row.
 *
 * The row is looked up by the id the caller resolves from the verified token
 * (`auth.uid()`), never from a value supplied by the page. The read runs on the
 * authenticated client, so RLS independently confirms that the admin may see
 * their own row - a policy scoped to `auth.uid()` is the contract this module
 * expects, and bypassing it is not possible from here.
 *
 * `full_name` and `avatar_url` are the only two columns anything may write, and
 * `role` is read here only to be displayed.
 */

const ADMIN_PROFILE_COLUMNS = "id, full_name, role, avatar_url, created_at, updated_at" as const;

export type AdminProfile = TableRow<"profiles">;

export type AdminProfileRead =
  | { readonly status: "success"; readonly profile: AdminProfile }
  | { readonly status: "empty" }
  | { readonly status: "error" };

/** The admin's own profile row. No visibility flag exists; RLS decides. */
export async function getAdminProfile(id: string): Promise<AdminProfileRead> {
  const supabase = await getSupabaseAuthClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(ADMIN_PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`[supabase] admin.profile.get failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { status: "error" };
  }

  if (data === null) {
    return { status: "empty" };
  }

  return { status: "success", profile: data };
}
