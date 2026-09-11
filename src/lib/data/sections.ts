import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isEmptyList, type QueryResult, toQueryResult } from "@/lib/supabase/result";
import type { TableRow } from "@/lib/supabase/tables";
import type { PublicDepartment } from "@/types/content";
import { getPublicSectionPreviews } from "@/lib/data/section-media";

/**
 * Read access to `public.sections`, which is what the homepage calls "Departments"
 * and the root of the sections -> venues -> menus hierarchy.
 */

/**
 * Explicit column list rather than `select("*")`. Three reasons: the response stays
 * small, adding a column upstream cannot silently widen what the site ships, and
 * the compiler resolves the row shape from these names so `mapDepartment` is checked
 * against the real schema.
 *
 * `slug` is included because the card now links each department to its detail page
 * on both the homepage band and the `/departments` list, so the print consumers
 * need it here; the menu tree, whose browse links also need `slug`, selects it
 * separately in `src/lib/data/menu.ts`.
 */
const DEPARTMENT_COLUMNS = "id, name, slug, description, image_url, display_order" as const;

/**
 * The subset of `sections` this module reads, derived from the generated schema rather
 * than restated. Previously these fields were spelled out by hand, because the
 * table's columns had only been observed from sample rows; now that official types
 * exist, `Pick` keeps them in step - renaming or retyping a column upstream breaks this
 * line instead of silently disagreeing with the database.
 */
type DepartmentRow = Pick<
  TableRow<"sections">,
  "id" | "name" | "slug" | "description" | "image_url" | "display_order"
>;

/**
 * Rejects rows that cannot be rendered.
 *
 * The generated types now come from the catalogue, so `name` really is `NOT NULL` -
 * this is no longer guarding against optimistic nullability the way it was
 * when the schema had only been observed from sample rows. What it still catches is
 * what a constraint cannot: `NOT NULL` permits the empty string, and `""` is a row that
 * exists but has no name to print.
 *
 * This is not a visibility check. Which rows exist is decided by RLS and by the
 * `is_active` filter in the query, never here.
 */
function isRenderable(row: DepartmentRow): boolean {
  return (
    typeof row.id === "string" &&
    row.id.length > 0 &&
    typeof row.name === "string" &&
    row.name.trim().length > 0
  );
}

function mapDepartment(row: DepartmentRow, previewImageUrl: string | null): PublicDepartment {
  return {
    id: row.id,
    name: row.name.trim(),
    slug: row.slug.trim(),
    description: row.description?.trim() ?? null,
    imageUrl: row.image_url,
    previewImageUrl,
    displayOrder: row.display_order,
  };
}

/**
 * Resolves each department's list-card visual: the first active `section_images` row
 * when one exists, else the legacy single `sections.image_url`. Never a broken image.
 */
async function snapshotPreviews(
  departments: readonly DepartmentRow[],
): Promise<ReadonlyMap<string, string | null>> {
  const previews = await getPublicSectionPreviews(departments.map((row) => row.id));
  const byId = new Map<string, string | null>();

  for (const row of departments) {
    byId.set(
      row.id,
      previews.get(row.id) ?? (typeof row.image_url === "string" ? row.image_url : null),
    );
  }

  return byId;
}

/**
 * Publicly visible departments, ordered by `display_order` ascending.
 *
 * `display_order` is 0 for every current row, so it alone is not a stable sort.
 * `name` is applied as a tiebreaker to keep ordering deterministic across requests -
 * without it Postgres may return equal-ranked rows in any order and the rendered
 * page would change between builds for no reason.
 *
 * `is_active` is filtered in the query because it expresses editorial intent, which
 * is not necessarily the same thing as the RLS predicate. RLS remains the security
 * boundary and is not reimplemented here; this filter only narrows within what RLS
 * has already permitted. If a policy already excludes inactive rows the filter is
 * merely redundant, never contradictory.
 */
export async function getPublicDepartments(): Promise<QueryResult<readonly PublicDepartment[]>> {
  const supabase = getSupabaseServerClient();

  const response = await supabase
    .from("sections")
    .select(DEPARTMENT_COLUMNS)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  const result = toQueryResult("sections.getPublicDepartments", response, isEmptyList);

  if (result.status !== "success") {
    return result;
  }

  const departments = result.data.filter(isRenderable);
  const previews = await snapshotPreviews(departments);
  const mapped = departments.map((row) => mapDepartment(row, previews.get(row.id) ?? null));

  const discarded = result.data.length - mapped.length;
  if (discarded > 0) {
    console.warn(
      `[data] sections.getPublicDepartments discarded ${discarded} unrenderable row(s) ` +
        `(missing id or name)`,
    );
  }

  // Every row failing validation is not an empty table - it is a content problem
  // that should surface as an empty section rather than a broken render.
  return mapped.length === 0 ? { status: "empty" } : { status: "success", data: mapped };
}

/**
 * One publicly visible department by slug, for the department detail page.
 *
 * The same scoping and renderability rules as `getPublicDepartments`, but the
 * lookup key is the URL slug. A blank or unknown slug returns `empty`, which the
 * page turns into `notFound()` rather than inventing a department.
 */
export async function getPublicDepartmentBySlug(
  slug: string,
): Promise<QueryResult<PublicDepartment>> {
  const supabase = getSupabaseServerClient();

  const response = await supabase
    .from("sections")
    .select(DEPARTMENT_COLUMNS)
    .eq("is_active", true)
    .eq("slug", slug)
    .limit(1);

  const result = toQueryResult(
    "sections.getPublicDepartmentBySlug",
    response,
    (rows) => rows.length === 0,
  );

  if (result.status !== "success") {
    return result;
  }

  const row = result.data[0];

  // `noUncheckedIndexedAccess` is on; the emptiness predicate above is not visible
  // to the compiler as a narrowing of index access.
  if (!row || !isRenderable(row)) {
    return { status: "empty" };
  }

  return { status: "success", data: mapDepartment(row, row.image_url) };
}
