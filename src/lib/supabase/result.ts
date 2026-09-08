import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Outcome of a data-layer query.
 *
 * Three states are modelled explicitly so a caller cannot conflate "the database
 * returned nothing" with "the query failed". A section with no rows should render
 * an empty state; a section whose query errored should render an error state.
 * Collapsing both into `[]` is how a broken deployment ends up looking merely
 * empty.
 */
export type QueryResult<T> =
  | { readonly status: "success"; readonly data: T }
  | { readonly status: "empty" }
  | { readonly status: "error"; readonly message: string };

/** Message shown to visitors. Deliberately free of database detail. */
const PUBLIC_ERROR_MESSAGE = "content-unavailable";

/**
 * Normalises a Supabase response into a `QueryResult`.
 *
 * Errors are logged server-side with their full Postgrest detail - code, hint,
 * and message - because silently swallowing them is how a missing RLS policy goes
 * unnoticed for weeks. The value returned to the UI carries only an opaque token,
 * so table names, column names, and policy failures never reach the browser.
 *
 * `isEmpty` decides what "nothing to show" means for the shape being returned,
 * since that differs between a list and a single row.
 */
export function toQueryResult<T>(
  context: string,
  response: { data: T | null; error: PostgrestError | null },
  isEmpty: (data: T) => boolean,
): QueryResult<T> {
  if (response.error) {
    console.error(`[supabase] ${context} failed: ${response.error.message}`, {
      code: response.error.code,
      details: response.error.details,
      hint: response.error.hint,
    });

    return { status: "error", message: PUBLIC_ERROR_MESSAGE };
  }

  if (response.data === null || isEmpty(response.data)) {
    return { status: "empty" };
  }

  return { status: "success", data: response.data };
}

/** `isEmpty` helper for list queries. */
export function isEmptyList(rows: readonly unknown[]): boolean {
  return rows.length === 0;
}
