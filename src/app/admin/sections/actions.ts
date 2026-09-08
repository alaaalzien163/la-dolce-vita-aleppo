"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { SECTION_ACTION_ERROR, type SectionFormState } from "@/app/admin/sections/error-keys";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePublicDepartments } from "@/lib/cache/public-revalidation";
import { getAdminSection } from "@/lib/data/admin/sections";
import {
  deleteOwnedSectionImage,
  STORAGE_ERROR,
  uploadSectionImage,
} from "@/lib/storage/section-image";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import { parseSectionForm } from "@/lib/validation/section";

/**
 * Mutations for `public.sections`.
 *
 * EVERY ACTION STARTS WITH `requireAdmin()`. A Server Action is a public HTTP endpoint -
 * reachable by anyone who knows its id, whether or not they ever loaded the page that
 * renders it - so the guard on the page protects the page, not these. Authorization is
 * re-established per call, from the session cookie, against `profiles.role`.
 *
 * Everything runs through the authenticated client, so RLS decides what each statement may
 * touch. There is no second permission system here and no privileged key anywhere: if a
 * policy would refuse the write, it refuses it.
 *
 * Postgrest errors are logged with their code and hint and never returned. The admin sees
 * an application-level key; the detail stays in the server log where it is useful.
 */

/** Uniqueness is enforced by a database constraint; this is how it surfaces. */
const UNIQUE_VIOLATION = "23505";

/**
 * Rebuilds the public pages that render sections.
 *
 * Sections feed the homepage Departments band and the dedicated Departments page,
 * so both routes in both locales are invalidated - and no more. A blanket
 * `revalidatePath("/", "layout")` would discard every cached route on the site to
 * publish one section, which is why it is not used here.
 */
function revalidatePublicSections(): void {
  revalidatePublicDepartments();
}

/** The optional file input arrives as an empty `File` when nothing was chosen. */
function readImageFile(formData: FormData): File | null {
  const value = formData.get("image");
  return value instanceof File && value.size > 0 ? value : null;
}

export async function createSection(
  _previous: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireAdmin();

  const parsed = parseSectionForm(formData);

  if (!parsed.ok) {
    return { status: "invalid", fields: parsed.errors };
  }

  const supabase = await getSupabaseAuthClient();

  // The row is inserted before the image is uploaded, because the object path is keyed by
  // the section's id and the database is what mints it. A failed upload afterwards leaves
  // a section without a picture, which is a valid state the admin can retry - the reverse
  // order would leave an orphaned file under an id that never existed.
  const { data, error } = await supabase
    .from("sections")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      display_order: parsed.data.displayOrder,
      is_active: parsed.data.isActive,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === UNIQUE_VIOLATION) {
      return { status: "invalid", fields: { slug: "slugInvalid" } };
    }

    console.error(`[admin] section insert failed: ${error?.message}`, {
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    return { status: "error", error: SECTION_ACTION_ERROR.saveFailed };
  }

  const file = readImageFile(formData);

  if (file) {
    const upload = await uploadSectionImage(data.id, file);

    if (!upload.ok) {
      // The section exists and is usable; only the picture failed. Reported as an error so
      // the admin knows to retry, rather than silently saving without it.
      revalidatePublicSections();
      return { status: "error", error: upload.error };
    }

    const { error: linkError } = await supabase
      .from("sections")
      .update({ image_url: upload.image.publicUrl })
      .eq("id", data.id);

    if (linkError) {
      // The row could not be pointed at the object, so the object is not wanted.
      await deleteOwnedSectionImage(data.id, upload.image.publicUrl);
      console.error(`[admin] section image link failed: ${linkError.message}`, {
        code: linkError.code,
      });
      revalidatePublicSections();
      return { status: "error", error: STORAGE_ERROR.uploadFailed };
    }
  }

  revalidatePublicSections();
  redirect("/admin/sections");
}

export async function updateSection(
  _previous: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { status: "error", error: SECTION_ACTION_ERROR.notFound };
  }

  const parsed = parseSectionForm(formData);

  if (!parsed.ok) {
    return { status: "invalid", fields: parsed.errors };
  }

  const existing = await getAdminSection(id);

  if (existing.status === "empty") {
    return { status: "error", error: SECTION_ACTION_ERROR.notFound };
  }

  if (existing.status === "error") {
    return { status: "error", error: SECTION_ACTION_ERROR.saveFailed };
  }

  const supabase = await getSupabaseAuthClient();
  const removeImage = formData.get("removeImage") === "on";
  const file = readImageFile(formData);

  let imageUrl: string | null = existing.data.image_url;
  let uploadedUrl: string | null = null;

  if (file) {
    const upload = await uploadSectionImage(id, file);

    if (!upload.ok) {
      return { status: "error", error: upload.error };
    }

    uploadedUrl = upload.image.publicUrl;
    imageUrl = uploadedUrl;
  } else if (removeImage) {
    imageUrl = null;
  }

  const { error } = await supabase
    .from("sections")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      display_order: parsed.data.displayOrder,
      is_active: parsed.data.isActive,
      image_url: imageUrl,
    })
    .eq("id", id);

  if (error) {
    // Roll back the freshly uploaded object: the row still points at the old image, so the
    // new one is unreferenced.
    if (uploadedUrl) {
      await deleteOwnedSectionImage(id, uploadedUrl);
    }

    if (error.code === UNIQUE_VIOLATION) {
      return { status: "invalid", fields: { slug: "slugInvalid" } };
    }

    console.error(`[admin] section update failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { status: "error", error: SECTION_ACTION_ERROR.saveFailed };
  }

  // Only now is the previous object genuinely unreferenced. Deleting it before the update
  // committed would have broken the live page if the update then failed.
  const replaced = (file || removeImage) && existing.data.image_url !== imageUrl;

  if (replaced) {
    await deleteOwnedSectionImage(id, existing.data.image_url);
  }

  revalidatePublicSections();
  redirect("/admin/sections");
}

/**
 * Flips `is_active`.
 *
 * Reads the current value rather than accepting a desired one from the form. A submitted
 * target would let a stale page overwrite a change made in another tab, and it would also
 * let anyone calling the endpoint set the state directly instead of toggling it.
 */
export async function toggleSectionActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return;
  }

  const existing = await getAdminSection(id);

  if (existing.status !== "success") {
    return;
  }

  const supabase = await getSupabaseAuthClient();

  const { error } = await supabase
    .from("sections")
    .update({ is_active: !existing.data.is_active })
    .eq("id", id);

  if (error) {
    console.error(`[admin] section toggle failed for ${id}: ${error.message}`, {
      code: error.code,
    });
    return;
  }

  revalidatePublicSections();
  revalidatePath("/admin/sections");
}

export async function deleteSection(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/admin/sections");
  }

  const existing = await getAdminSection(id);

  if (existing.status !== "success") {
    // Already gone, or unreadable. Either way there is nothing to delete.
    redirect("/admin/sections");
  }

  const supabase = await getSupabaseAuthClient();
  const { error } = await supabase.from("sections").delete().eq("id", id);

  if (error) {
    console.error(`[admin] section delete failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    redirect(`/admin/sections?error=${SECTION_ACTION_ERROR.deleteFailed}`);
  }

  // After the row is gone, so a failed delete never strands the page without its image.
  // Scoped to `sections/<id>/`, so this cannot reach another section's objects.
  await deleteOwnedSectionImage(id, existing.data.image_url);

  revalidatePublicSections();
  revalidatePath("/admin/sections");
  redirect("/admin/sections");
}
