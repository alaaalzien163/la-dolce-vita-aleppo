"use server";

import { revalidatePath } from "next/cache";

import {
  SECTION_MEDIA_ERROR,
  type SectionMediaActionError,
  type SectionMediaFileError,
  type SectionMediaState,
} from "@/app/admin/sections/media-error-keys";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePublicDepartments } from "@/lib/cache/public-revalidation";
import { listAdminSectionMedia } from "@/lib/data/admin/section-media";
import { deleteOwnedSectionImage, uploadSectionImages } from "@/lib/storage/section-image";
import { getSupabaseAuthClient } from "@/lib/supabase/server";

function revalidateSectionManager(sectionId: string): void {
  revalidatePublicDepartments();
  revalidatePath(`/admin/sections/${sectionId}/edit`);
  revalidatePath("/admin/sections");
}

/**
 * Relative public asset paths for department videos served from `public/videos`
 * (the same pattern the hero/about decorative video already uses). Allowed formats
 * are the browser-safe subset the carousel can play natively.
 */
const VIDEO_PATH_PATTERN = /^\/videos\/[^?#\s]+\.(mp4|webm)$/i;

function splitVideoPaths(value: string): readonly string[] {
  return value
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export async function uploadSectionMediaAction(
  _previous: SectionMediaState,
  formData: FormData,
): Promise<SectionMediaState> {
  await requireAdmin();

  const sectionId = String(formData.get("sectionId") ?? "");

  if (!sectionId) {
    return { status: "error", error: SECTION_MEDIA_ERROR.notFound, failedFiles: [] };
  }

  const mediaType = String(formData.get("mediaType") ?? "image");

  const supabase = await getSupabaseAuthClient();

  const { data: currentMax } = await supabase
    .from("section_images")
    .select("display_order")
    .eq("section_id", sectionId)
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const baseOrder = currentMax?.display_order ?? 0;

  if (mediaType === "video") {
    const paths = splitVideoPaths(String(formData.get("videoPaths") ?? ""));

    if (paths.length === 0) {
      return { status: "error", error: SECTION_MEDIA_ERROR.noVideos, failedFiles: [] };
    }

    const invalid = paths.find((path) => !VIDEO_PATH_PATTERN.test(path));
    if (invalid) {
      return { status: "error", error: SECTION_MEDIA_ERROR.invalidVideoPath, failedFiles: [] };
    }

    // Optional poster image, uploaded through the existing image pipeline. It is
    // attached to the first video of this batch; reordering is done in the list.
    let posterUrl: string | null = null;
    const failedFiles: SectionMediaFileError[] = [];

    const rawPoster = formData.get("poster");
    if (rawPoster instanceof File && rawPoster.size > 0) {
      const posterResult = await uploadSectionImages(sectionId, [rawPoster]);
      const poster = posterResult.uploaded[0];
      if (poster) {
        posterUrl = poster.publicUrl;
      } else if (posterResult.failures.length > 0) {
        failedFiles.push({ name: rawPoster.name, error: posterResult.failures[0]!.error });
      }
    }

    const insertRows = paths.map((path, i) => ({
      section_id: sectionId,
      image_url: path,
      media_type: "video",
      poster_url: i === 0 ? posterUrl : null,
      display_order: baseOrder + i + 1,
    }));

    const { error: insertError } = await supabase.from("section_images").insert(insertRows);

    if (insertError) {
      if (posterUrl) {
        await deleteOwnedSectionImage(sectionId, posterUrl);
      }
      console.error(`[admin] section_images video insert failed for ${sectionId}: ${insertError.message}`, {
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });
      return { status: "error", error: SECTION_MEDIA_ERROR.insertFailed, failedFiles };
    }

    revalidateSectionManager(sectionId);

    return {
      status: "success",
      uploaded: insertRows.length,
      failed: failedFiles.length,
    };
  }

  const rawFiles = formData.getAll("images");
  const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return { status: "error", error: SECTION_MEDIA_ERROR.noFiles, failedFiles: [] };
  }

  const result = await uploadSectionImages(sectionId, files);

  const failedFiles: SectionMediaFileError[] = result.failures.map((f) => ({
    name: f.fileName,
    error: f.error,
  }));

  if (result.uploaded.length === 0) {
    const generalError: SectionMediaActionError =
      failedFiles.length > 0 ? failedFiles[0]!.error : SECTION_MEDIA_ERROR.insertFailed;
    return { status: "error", error: generalError, failedFiles };
  }

  const insertRows = result.uploaded.map((img, i) => ({
    section_id: sectionId,
    image_url: img.publicUrl,
    media_type: "image",
    display_order: baseOrder + i + 1,
  }));

  const { error: insertError } = await supabase.from("section_images").insert(insertRows);

  if (insertError) {
    for (const img of result.uploaded) {
      await deleteOwnedSectionImage(sectionId, img.publicUrl);
    }
    console.error(`[admin] section_images insert failed for ${sectionId}: ${insertError.message}`, {
      code: insertError.code,
      details: insertError.details,
      hint: insertError.hint,
    });
    return { status: "error", error: SECTION_MEDIA_ERROR.insertFailed, failedFiles };
  }

  revalidateSectionManager(sectionId);

  return {
    status: "success",
    uploaded: result.uploaded.length,
    failed: failedFiles.length,
  };
}

export async function deleteSectionMediaAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const rowId = String(formData.get("id") ?? "");
  if (!rowId) {
    return;
  }

  const supabase = await getSupabaseAuthClient();

  const { data: row } = await supabase
    .from("section_images")
    .select("section_id, image_url, poster_url")
    .eq("id", rowId)
    .limit(1)
    .single();

  if (!row) {
    return;
  }

  const { error } = await supabase.from("section_images").delete().eq("id", rowId);

  if (error) {
    console.error(`[admin] section_images delete failed for ${rowId}: ${error.message}`, {
      code: error.code,
    });
    return;
  }

  // Image URLs and video posters may reference owned storage objects; public asset
  // paths for the videos themselves resolve to nothing owned and stay untouched.
  await deleteOwnedSectionImage(row.section_id, row.image_url);
  await deleteOwnedSectionImage(row.section_id, row.poster_url);

  revalidateSectionManager(row.section_id);
}

export async function moveSectionMediaAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const rowId = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "") as "up" | "down";

  if (!rowId || (direction !== "up" && direction !== "down")) {
    return;
  }

  const supabase = await getSupabaseAuthClient();

  const { data: row } = await supabase
    .from("section_images")
    .select("section_id")
    .eq("id", rowId)
    .limit(1)
    .single();

  if (!row) {
    return;
  }

  const sectionId = row.section_id;

  const result = await listAdminSectionMedia(sectionId);
  if (result.status !== "success") {
    return;
  }

  const media = [...result.data];
  const targetIdx = media.findIndex((item) => item.id === rowId);

  if (targetIdx === -1) {
    return;
  }

  const swapIdx = direction === "up" ? targetIdx - 1 : targetIdx + 1;
  if (swapIdx < 0 || swapIdx >= media.length) {
    return;
  }

  const targetOrder = media[targetIdx]!.displayOrder;
  const swapOrder = media[swapIdx]!.displayOrder;

  await supabase
    .from("section_images")
    .update({ display_order: swapOrder })
    .eq("id", media[targetIdx]!.id);

  await supabase
    .from("section_images")
    .update({ display_order: targetOrder })
    .eq("id", media[swapIdx]!.id);

  revalidateSectionManager(sectionId);
}

export async function toggleSectionMediaAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const rowId = String(formData.get("id") ?? "");
  if (!rowId) {
    return;
  }

  const supabase = await getSupabaseAuthClient();

  const { data: row } = await supabase
    .from("section_images")
    .select("section_id, is_active")
    .eq("id", rowId)
    .limit(1)
    .single();

  if (!row) {
    return;
  }

  const { error } = await supabase
    .from("section_images")
    .update({ is_active: !row.is_active })
    .eq("id", rowId);

  if (error) {
    console.error(`[admin] section_images toggle failed for ${rowId}: ${error.message}`, {
      code: error.code,
    });
    return;
  }

  revalidateSectionManager(row.section_id);
}