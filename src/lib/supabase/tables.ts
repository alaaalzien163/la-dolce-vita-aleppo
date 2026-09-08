import type { Database } from "@/lib/supabase/database.types";

/**
 * Row shape of a table in the `public` schema.
 *
 * The Supabase CLI does not emit a `Row<T>` helper. It emits `Tables<T>`, which also
 * resolves views and accepts a `{ schema }` option through several layers of
 * conditional types. This alias is the direct indexed access instead - narrower,
 * readable in editor tooltips, and it fails loudly on a table name that does not
 * exist rather than quietly resolving to `never`.
 *
 * Type-only, and scoped to the data layer and the domain type definitions. UI
 * components import from `@/types/content` and never see `Database`, so a schema
 * change cannot ripple into a component's props by accident.
 *
 * Use `Database["public"]["Tables"][T]["Insert"]` / `["Update"]` directly when write
 * operations arrive; there is no reason to alias those until something needs them.
 */
export type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
