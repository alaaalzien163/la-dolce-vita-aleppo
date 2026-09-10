import "server-only";

import { toQueryResult, type QueryResult } from "@/lib/supabase/result";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/tables";

const SECTION_IMAGE_COLUMNS = "id, image_url, display_order, is_active" as const;

type AdminSectionImageRow = Pick<
  TableRow<"section_images">,
  "id" | "image_url" | "display_order" | "is_active"
>;

export type AdminSectionImage = {
  readonly id: string;
  readonly imageUrl: string;
  readonly displayOrder: number;
  readonly isActive: boolean;
};

function mapImage(row: AdminSectionImageRow): AdminSectionImage {
  return {
    id: row.id,
    imageUrl: row.image_url,
    displayOrder: row.display_order,
    isActive: row.is_active,
  };
}

/**
 * All images for one section, including inactive rows the admin may manage.
 *
 * Ordered the same way the public site orders them, so the manager shows a
 * faithful preview of what visitors see. Reused for both the edit page's
 * manager and the move-up/down action's neighbour lookup.
 */
export async function listAdminSectionImages(
  sectionId: string,
): Promise<QueryResult<readonly AdminSectionImage[]>> {
  const supabase = await getSupabaseAuthClient();

  const response = await supabase
    .from("section_images")
    .select(SECTION_IMAGE_COLUMNS)
    .eq("section_id", sectionId)
    .order("display_order", { ascending: true })
    .order("id", { ascending: true });

  const result = toQueryResult("admin.section-images.list", response, (rows) => rows.length === 0);

  if (result.status !== "success") {
    return result;
  }

  const images = result.data.map(mapImage);

  return { status: "success", data: images };
}
