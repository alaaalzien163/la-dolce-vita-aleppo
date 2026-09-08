import "server-only";

import { toQueryResult, type QueryResult } from "@/lib/supabase/result";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/tables";

/**
 * Admin reads for `public.sections`.
 *
 * Separate from `src/lib/data/sections.ts`, which serves the public site. The two differ
 * in three ways that matter, and merging them would mean a flag deciding all three:
 *
 *   client   this uses the authenticated client, so RLS evaluates the admin's own
 *            policies rather than the anon role's
 *   scope    inactive rows are included - hiding them is exactly what the admin needs to
 *            see and change
 *   shape    `is_active` and `updated_at` are carried, because the management table
 *            displays status and the edit form has to round-trip it
 *
 * The public module also applies a publishability rule that withholds rows with no
 * description or image. Applying that here would hide the very records the admin needs to
 * finish, so this returns everything RLS permits.
 */

/** Columns the management screens read. `created_at` is not among them - nothing shows it. */
const ADMIN_SECTION_COLUMNS =
  "id, name, slug, description, image_url, display_order, is_active" as const;

export type AdminSection = Pick<
  TableRow<"sections">,
  "id" | "name" | "slug" | "description" | "image_url" | "display_order" | "is_active"
>;

/**
 * Every section the admin may see, ordered as the public site orders them.
 *
 * `display_order` then `name`, matching `getPublicDepartments()` exactly. If the two
 * disagreed, the admin would be reordering against a preview that does not reflect what
 * visitors get.
 */
export async function listAdminSections(): Promise<QueryResult<readonly AdminSection[]>> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase
    .from("sections")
    .select(ADMIN_SECTION_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  return toQueryResult("admin.sections.list", response, (rows) => rows.length === 0);
}

/** One section by id, for the edit and delete-confirmation screens. */
export async function getAdminSection(id: string): Promise<QueryResult<AdminSection>> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase
    .from("sections")
    .select(ADMIN_SECTION_COLUMNS)
    .eq("id", id)
    .limit(1);

  const result = toQueryResult("admin.sections.get", response, (rows) => rows.length === 0);

  if (result.status !== "success") {
    return result;
  }

  const row = result.data[0];

  // `noUncheckedIndexedAccess` is on; the emptiness predicate above is not visible to the
  // compiler as a narrowing of index access.
  return row ? { status: "success", data: row } : { status: "empty" };
}
