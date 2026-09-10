"use server";

import { revalidatePath } from "next/cache";

import {
  SECTION_IMAGE_ERROR,
  type SectionImageActionError,
  type SectionImageFileError,
  type SectionImagesState,
} from "@/app/admin/sections/image-error-keys";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePublicDepartments } from "@/lib/cache/public-revalidation";
import { listAdminSectionImages } from "@/lib/data/admin/section-images";
import { deleteOwnedSectionImage, uploadSectionImages } from "@/lib/storage/section-image";
import { getSupabaseAuthClient } from "@/lib/supabase/server";

function revalidateSectionManager(sectionId: string): void {
  revalidatePublicDepartments();
  revalidatePath(`/admin/sections/${sectionId}/edit`);
  revalidatePath("/admin/sections");
}

export async function uploadSectionImagesAction(
  _previous: SectionImagesState,
  formData: FormData,
): Promise<SectionImagesState> {
  await requireAdmin();

  const sectionId = String(formData.get("sectionId") ?? "");

  if (!sectionId) {
    return { status: "error", error: SECTION_IMAGE_ERROR.notFound, failedFiles: [] };
  }

  const rawFiles = formData.getAll("images");
  const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return { status: "error", error: SECTION_IMAGE_ERROR.noFiles, failedFiles: [] };
  }

  const result = await uploadSectionImages(sectionId, files);

  const failedFiles: SectionImageFileError[] = result.failures.map((f) => ({
    name: f.fileName,
    error: f.error,
  }));

  if (result.uploaded.length === 0) {
    const generalError: SectionImageActionError =
      failedFiles.length > 0 ? failedFiles[0]!.error : SECTION_IMAGE_ERROR.insertFailed;
    return { status: "error", error: generalError, failedFiles };
  }

  const supabase = await getSupabaseAuthClient();

  const { data: currentMax } = await supabase
    .from("section_images")
    .select("display_order")
    .eq("section_id", sectionId)
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const baseOrder = currentMax?.display_order ?? 0;

  const insertRows = result.uploaded.map((img, i) => ({
    section_id: sectionId,
    image_url: img.publicUrl,
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
    return { status: "error", error: SECTION_IMAGE_ERROR.insertFailed, failedFiles };
  }

  revalidateSectionManager(sectionId);

  return {
    status: "success",
    uploaded: result.uploaded.length,
    failed: failedFiles.length,
  };
}

export async function deleteSectionImageAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const rowId = String(formData.get("id") ?? "");
  if (!rowId) {
    return;
  }

  const supabase = await getSupabaseAuthClient();

  const { data: row } = await supabase
    .from("section_images")
    .select("section_id, image_url")
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

  await deleteOwnedSectionImage(row.section_id, row.image_url);

  revalidateSectionManager(row.section_id);
}

export async function moveSectionImageAction(formData: FormData): Promise<void> {
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

  const result = await listAdminSectionImages(sectionId);
  if (result.status !== "success") {
    return;
  }

  const images = [...result.data];
  const targetIdx = images.findIndex((img) => img.id === rowId);

  if (targetIdx === -1) {
    return;
  }

  const swapIdx = direction === "up" ? targetIdx - 1 : targetIdx + 1;
  if (swapIdx < 0 || swapIdx >= images.length) {
    return;
  }

  const targetOrder = images[targetIdx]!.displayOrder;
  const swapOrder = images[swapIdx]!.displayOrder;

  await supabase
    .from("section_images")
    .update({ display_order: swapOrder })
    .eq("id", images[targetIdx]!.id);

  await supabase
    .from("section_images")
    .update({ display_order: targetOrder })
    .eq("id", images[swapIdx]!.id);

  revalidateSectionManager(sectionId);
}
