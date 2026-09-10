import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isEmptyList, type QueryResult, toQueryResult } from "@/lib/supabase/result";
import type { TableRow } from "@/lib/supabase/tables";
import type { PublicSectionImage } from "@/types/content";

/**
 * Read access to `public.section_images` - the multi-image gallery of a Department
 * (`public.sections`), the table that retired Gallery now feeds.
 *
 * The public site consumes these rows in two places: the Department detail page's
 * carousel and the Departments list cards (first-image preview). This module stays
 * deliberately small - one batched accessor for each, scoped to what that surface
 * renders.
 *
 * BUSINESS RULES, mirroring `getPublicDepartments`:
 *   - `is_active = true` is filtered in the query - it expresses editorial intent
 *     and is narrowed within whatever RLS has already permitted, never reimplemented.
 *   - `display_order ASC` is the editorial order. It is `0` for every current row,
 *     so `id` is applied as a deterministic tiebreaker - without it Postgres may
 *     return equal-ranked rows in any order and the page could rearrange between
 *     builds for no reason.
 *
 * One query per department, never one per image: a carousel for a department with
 * several pictures is a single batched read, issued server-side during
 * pre-rendering, in line with the project's free-plan shape.
 */

const SECTION_IMAGE_COLUMNS = "id, image_url, alt_text" as const;
const SECTION_PREVIEW_COLUMNS = "id, section_id, image_url" as const;

type SectionImageRow = Pick<TableRow<"section_images">, "id" | "image_url" | "alt_text">;

function mapSectionImage(row: SectionImageRow): PublicSectionImage {
  return {
    id: row.id,
    imageUrl: row.image_url,
    altText: row.alt_text?.trim() || null,
  };
}

/**
 * The publishable images of one section, ordered as the admin ordered them.
 *
 * Rows whose `image_url` is missing or blank cannot render; they are discarded the
 * same way `sections.ts` discards nameless departments, and an all-blank set is
 * reported as an empty result rather than a broken carousel.
 */
export async function getPublicSectionImages(
  sectionId: string,
): Promise<QueryResult<readonly PublicSectionImage[]>> {
  const supabase = getSupabaseServerClient();

  const response = await supabase
    .from("section_images")
    .select(SECTION_IMAGE_COLUMNS)
    .eq("section_id", sectionId)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("id", { ascending: true });

  const result = toQueryResult("section-images.getPublicSectionImages", response, isEmptyList);

  if (result.status !== "success") {
    return result;
  }

  const images = result.data
    .filter((row) => typeof row.image_url === "string" && row.image_url.trim().length > 0)
    .map(mapSectionImage);

  const discarded = result.data.length - images.length;
  if (discarded > 0) {
    console.warn(
      `[data] section-images.getPublicSectionImages discarded ${discarded} row(s) ` +
        `with a blank image_url`,
    );
  }

  return images.length === 0 ? { status: "empty" } : { status: "success", data: images };
}

/**
 * The first active image of each requested section, for the Departments list cards.
 *
 * One batched query for the whole set - never one per department - ordered the same way
 * the carousel is, so the preview card and the carousel cannot disagree about which image
 * is first. Only `section_id` and `image_url` are shipped; everything else a list card
 * might not need is left in the database.
 *
 * A section with no active images simply has no entry in the map; callers fall back to
 * the legacy `sections.image_url`.
 */
export async function getPublicSectionPreviews(
  sectionIds: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  if (sectionIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseServerClient();

  const response = await supabase
    .from("section_images")
    .select(SECTION_PREVIEW_COLUMNS)
    .in("section_id", [...sectionIds])
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("id", { ascending: true });

  if (response.error) {
    console.error(
      `[data] section-images.getPublicSectionPreviews failed: ${response.error.message}`,
      {
        code: response.error.code,
      },
    );
    return new Map();
  }

  const previews = new Map<string, string>();
  for (const row of response.data) {
    if (
      typeof row.image_url === "string" &&
      row.image_url.trim().length > 0 &&
      !previews.has(row.section_id)
    ) {
      previews.set(row.section_id, row.image_url);
    }
  }

  return previews;
}
