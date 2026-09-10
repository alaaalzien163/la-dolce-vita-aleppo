"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { SECTION_ACTION_ERROR, type SectionFormState } from "@/app/admin/sections/error-keys";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePublicDepartments } from "@/lib/cache/public-revalidation";
import { getAdminSection } from "@/lib/data/admin/sections";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import { parseSectionForm } from "@/lib/validation/section";

/**
 * Mutations for `public.sections` (the field form - name, slug, description, order, and
 * active state). The section's image gallery is managed separately, in `image-actions.ts`.
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

  revalidatePublicSections();
  // The image gallery is the last thing an admin adds to a section, so creation hands the
  // admin to the edit page (which hosts the gallery manager) rather than back to the list.
  return { status: "success", createdId: data.id };
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

  const { error } = await supabase
    .from("sections")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      display_order: parsed.data.displayOrder,
      is_active: parsed.data.isActive,
    })
    .eq("id", id);

  if (error) {
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

  revalidatePublicSections();
  revalidatePath("/admin/sections");
  redirect("/admin/sections");
}
