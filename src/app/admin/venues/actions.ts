"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { VENUE_ACTION_ERROR, type VenueFormState } from "@/app/admin/venues/error-keys";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePublicMenu } from "@/lib/cache/public-revalidation";
import { getAdminVenue, venueSectionExists } from "@/lib/data/admin/venues";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import { parseVenueForm } from "@/lib/validation/venue";

/**
 * Mutations for `public.venues`.
 *
 * EVERY ACTION STARTS WITH `requireAdmin()`. A Server Action is a public HTTP endpoint -
 * reachable by anyone who knows its id, whether or not they ever loaded the page that
 * renders it - so the guard on the page protects the page, not these. Authorization is
 * re-established per call, from the session cookie, against `profiles.role`.
 *
 * Everything runs through the authenticated client, so RLS decides what each statement may
 * touch. There is no service-role key anywhere and no second permission system: if a
 * policy would refuse the write, it refuses it.
 *
 * Postgrest errors are logged with their code and hint and never returned. The admin sees
 * an application-level key; the detail stays in the server log where it is useful.
 */

/** Uniqueness is enforced by a database constraint; this is how it surfaces. */
const UNIQUE_VIOLATION = "23505";

/** A row is still referenced by another row's foreign key (e.g. a venue with menus). */
const FOREIGN_KEY_VIOLATION = "23503";

/**
 * Rebuilds the public pages that render venues: venues feed the dedicated Menu
 * page's hierarchy, so the homepage Menu teaser route and the Menu page route in
 * both locales are invalidated. A blanket `revalidatePath("/", "layout")` would
 * discard every cached route on the site to publish one venue, which is why it is
 * not used here.
 */
function revalidatePublicVenues(): void {
  revalidatePublicMenu();
}

export async function createVenue(
  _previous: VenueFormState,
  formData: FormData,
): Promise<VenueFormState> {
  await requireAdmin();

  const parsed = parseVenueForm(formData);

  if (!parsed.ok) {
    return { status: "invalid", fields: parsed.errors };
  }

  // The venue must start life under a section the admin can actually see. The reference
  // check runs here, before the insert, so a tampered form is stopped with a field-level
  // message rather than a database error; the foreign-key constraint is the backstop.
  if (!(await venueSectionExists(parsed.data.sectionId))) {
    return { status: "invalid", fields: { sectionId: "sectionNotFound" } };
  }

  const supabase = await getSupabaseAuthClient();

  const { data, error } = await supabase
    .from("venues")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      section_id: parsed.data.sectionId,
      description: parsed.data.description,
      display_order: parsed.data.displayOrder,
      is_active: parsed.data.isActive,
    })
    .select("id")
    .single();

  if (error || !data) {
    // A section deleted between the check above and this insert surfaces here as a
    // foreign-key violation; report it on the section field, where it belongs.
    if (error?.code === FOREIGN_KEY_VIOLATION) {
      return { status: "invalid", fields: { sectionId: "sectionNotFound" } };
    }

    if (error?.code === UNIQUE_VIOLATION) {
      return { status: "invalid", fields: { slug: "slugInvalid" } };
    }

    console.error(`[admin] venue insert failed: ${error?.message}`, {
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    return { status: "error", error: VENUE_ACTION_ERROR.saveFailed };
  }

  revalidatePublicVenues();
  redirect("/admin/venues");
}

export async function updateVenue(
  _previous: VenueFormState,
  formData: FormData,
): Promise<VenueFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { status: "error", error: VENUE_ACTION_ERROR.venueNotFound };
  }

  const parsed = parseVenueForm(formData);

  if (!parsed.ok) {
    return { status: "invalid", fields: parsed.errors };
  }

  const existing = await getAdminVenue(id);

  if (existing.status !== "success") {
    return { status: "error", error: VENUE_ACTION_ERROR.venueNotFound };
  }

  if (!(await venueSectionExists(parsed.data.sectionId))) {
    return { status: "invalid", fields: { sectionId: "sectionNotFound" } };
  }

  const supabase = await getSupabaseAuthClient();

  const { error } = await supabase
    .from("venues")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      section_id: parsed.data.sectionId,
      description: parsed.data.description,
      display_order: parsed.data.displayOrder,
      is_active: parsed.data.isActive,
    })
    .eq("id", id);

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { status: "invalid", fields: { sectionId: "sectionNotFound" } };
    }

    if (error.code === UNIQUE_VIOLATION) {
      return { status: "invalid", fields: { slug: "slugInvalid" } };
    }

    console.error(`[admin] venue update failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { status: "error", error: VENUE_ACTION_ERROR.saveFailed };
  }

  revalidatePublicVenues();
  redirect("/admin/venues");
}

/**
 * Flips `is_active`.
 *
 * Reads the current value rather than accepting a desired one from the form. A submitted
 * target would let a stale page overwrite a change made in another tab, and it would also
 * let anyone calling the endpoint set the state directly instead of toggling it.
 */
export async function toggleVenueActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return;
  }

  const existing = await getAdminVenue(id);

  if (existing.status !== "success") {
    return;
  }

  const supabase = await getSupabaseAuthClient();

  const { error } = await supabase
    .from("venues")
    .update({ is_active: !existing.data.is_active })
    .eq("id", id);

  if (error) {
    console.error(`[admin] venue toggle failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return;
  }

  revalidatePublicVenues();
  revalidatePath("/admin/venues");
}

export async function deleteVenue(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/admin/venues");
  }

  const existing = await getAdminVenue(id);

  if (existing.status !== "success") {
    // Already gone, or unreadable. Either way there is nothing to delete.
    redirect("/admin/venues");
  }

  const supabase = await getSupabaseAuthClient();
  const { error } = await supabase.from("venues").delete().eq("id", id);

  if (error) {
    // A foreign-key violation means dependent rows still reference this venue (e.g.
    // menus under it). Deleting would orphan them, so the database refuses; tell the
    // admin why, distinctly from a generic failure, and in the same place the list can
    // show the message.
    if (error.code === FOREIGN_KEY_VIOLATION) {
      console.error(
        `[admin] venue delete refused for ${id}: ${FOREIGN_KEY_VIOLATION} (referenced by dependent rows)`,
        { code: error.code, details: error.details, hint: error.hint },
      );
      redirect(`/admin/venues?error=${VENUE_ACTION_ERROR.deleteInUse}`);
    }

    console.error(`[admin] venue delete failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    redirect(`/admin/venues?error=${VENUE_ACTION_ERROR.deleteFailed}`);
  }

  revalidatePublicVenues();
  revalidatePath("/admin/venues");
  redirect("/admin/venues");
}
