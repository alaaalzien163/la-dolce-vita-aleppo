import "server-only";

import { toQueryResult, type QueryResult } from "@/lib/supabase/result";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/tables";

const SECTION_MEDIA_COLUMNS =
  "id, image_url, media_type, poster_url, display_order, is_active" as const;

type AdminSectionMediaRow = Pick<
  TableRow<"section_images">,
  "id" | "image_url" | "media_type" | "poster_url" | "display_order" | "is_active"
>;

export type AdminSectionMedia = {
  readonly id: string;
  readonly mediaUrl: string;
  readonly mediaType: "image" | "video";
  readonly posterUrl: string | null;
  readonly displayOrder: number;
  readonly isActive: boolean;
};

function mapMedia(row: AdminSectionMediaRow): AdminSectionMedia {
  return {
    id: row.id,
    mediaUrl: row.image_url,
    mediaType: row.media_type === "video" ? "video" : "image",
    posterUrl: row.poster_url?.trim() || null,
    displayOrder: row.display_order,
    isActive: row.is_active,
  };
}

/**
 * All media for one section, including inactive rows the admin may manage.
 *
 * Ordered the same way the public site orders them, so the manager shows a
 * faithful preview of what visitors see. Reused for both the edit page's
 * manager and the move-up/down action's neighbour lookup.
 */
export async function listAdminSectionMedia(
  sectionId: string,
): Promise<QueryResult<readonly AdminSectionMedia[]>> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase
    .from("section_images")
    .select(SECTION_MEDIA_COLUMNS)
    .eq("section_id", sectionId)
    .order("display_order", { ascending: true })
    .order("id", { ascending: true });

  const result = toQueryResult("admin.section-media.list", response, (rows) => rows.length === 0);

  if (result.status !== "success") {
    return result;
  }

  const media = result.data.map(mapMedia);

  return { status: "success", data: media };
}