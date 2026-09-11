import "server-only";

import { access } from "node:fs/promises";
import { resolve } from "node:path";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isEmptyList, type QueryResult, toQueryResult } from "@/lib/supabase/result";
import type { TableRow } from "@/lib/supabase/tables";
import type { PublicSectionMedia } from "@/types/content";

/**
 * Read access to `public.section_images` - the media of a Department
 * (`public.sections`). One row per media item: images and videos share a single
 * carousel and a single `display_order` sequence, discriminated by `media_type`.
 *
 * The public site consumes these rows in two places: the Department detail page's
 * carousel and the Departments list cards (first-media preview). This module stays
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
 * One query per department, never one per media item: a carousel with several
 * slides is a single batched read, issued server-side during pre-rendering, in
 * line with the project's free-plan shape.
 */

const SECTION_MEDIA_COLUMNS = "id, image_url, media_type, poster_url, alt_text" as const;
const SECTION_PREVIEW_COLUMNS = "id, section_id, image_url, media_type, poster_url" as const;

/**
 * At build time, verify that every video path references an actual file under
 * `public/`. Missing files are logged once per path. This does not run in
 * production request handlers (only during static generation).
 */
const checkedPaths = new Set<string>();

async function verifyVideoFile(publicPath: string): Promise<void> {
  if (checkedPaths.has(publicPath)) return;
  checkedPaths.add(publicPath);
  const diskPath = resolve(process.cwd(), "public", publicPath.slice(1));
  try {
    await access(diskPath);
  } catch {
    console.error(
      `[data] MISSING VIDEO FILE: ${publicPath} — expected at ${diskPath}. ` +
        `This video will fail to load in the carousel.`,
    );
  }
}

type SectionMediaRow = Pick<
  TableRow<"section_images">,
  "id" | "image_url" | "media_type" | "poster_url" | "alt_text"
>;

function mapSectionMedia(row: SectionMediaRow): PublicSectionMedia {
  return {
    id: row.id,
    mediaType: row.media_type === "video" ? "video" : "image",
    mediaUrl: row.image_url,
    altText: row.alt_text?.trim() || null,
    posterUrl: row.poster_url?.trim() || null,
  };
}

/**
 * The publishable media of one section, ordered as the admin ordered them.
 *
 * Rows whose media URL is missing or blank cannot render; they are discarded the
 * same way `sections.ts` discards nameless departments, and an all-blank set is
 * reported as an empty result rather than a broken carousel.
 */
export async function getPublicSectionMedia(
  sectionId: string,
): Promise<QueryResult<readonly PublicSectionMedia[]>> {
  const supabase = getSupabaseServerClient();

  const response = await supabase
    .from("section_images")
    .select(SECTION_MEDIA_COLUMNS)
    .eq("section_id", sectionId)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("id", { ascending: true });

  const result = toQueryResult("section-media.getPublicSectionMedia", response, isEmptyList);

  if (result.status !== "success") {
    return result;
  }

  const media = result.data
    .filter((row) => typeof row.image_url === "string" && row.image_url.trim().length > 0)
    .map(mapSectionMedia);

  // Verify video files exist. At build time (static generation) this catches
  // missing files early; in production the check is cached after the first call.
  await Promise.all(
    media
      .filter((item) => item.mediaType === "video")
      .map((item) => verifyVideoFile(item.mediaUrl)),
  );

  const discarded = result.data.length - media.length;
  if (discarded > 0) {
    console.warn(
      `[data] section-media.getPublicSectionMedia discarded ${discarded} row(s) ` +
        `with a blank image_url`,
    );
  }

  return media.length === 0 ? { status: "empty" } : { status: "success", data: media };
}

/**
 * The first previewable media of each requested section, for the Departments list
 * cards.
 *
 * One batched query for the whole set - never one per department - ordered the same
 * way the carousel is, so the preview card and the carousel cannot disagree about
 * which item comes first. Cards show a static image only: an image row previews
 * with its own URL, a video row previews with its poster image, and a poster-less
 * video is skipped in favour of the next previewable item - the poster URL is the
 * only image-safe representation of a card's video.
 *
 * A section with no previewable media simply has no entry in the map; callers fall
 * back to the legacy `sections.image_url`.
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
      `[data] section-media.getPublicSectionPreviews failed: ${response.error.message}`,
      {
        code: response.error.code,
      },
    );
    return new Map();
  }

  const previews = new Map<string, string>();
  for (const row of response.data) {
    if (previews.has(row.section_id)) {
      continue;
    }
    const candidate = row.media_type === "video" ? row.poster_url : row.image_url;
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      previews.set(row.section_id, candidate);
    }
  }

  return previews;
}