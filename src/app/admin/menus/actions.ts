"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { MENU_ACTION_ERROR, type MenuFormState } from "@/app/admin/menus/error-keys";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePublicMenu } from "@/lib/cache/public-revalidation";
import { getAdminMenu, menuVenueExists } from "@/lib/data/admin/menus";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import { parseMenuForm } from "@/lib/validation/menu";

/**
 * Mutations for `public.menus`.
 *
 * EVERY ACTION STARTS WITH `requireAdmin()`. A Server Action is a public HTTP endpoint -
 * reachable by anyone who knows its id, whether or not they ever loaded the page that
 * renders it - so the guard on the page protects the page, not these. Authorization is
 * re-established per call, from the session cookie, against `profiles.role`.
 *
 * Everything runs through the authenticated client, so RLS decides what each statement may
 * touch. There is no service-role key anywhere, no privileged RPC, and no second
 * permission system: if a policy would refuse the write, it refuses it.
 *
 * Postgrest errors are logged with their code and hint and never returned. The admin sees
 * an application-level key; the detail stays in the server log where it is useful.
 */

/** Uniqueness is enforced by a database constraint; this is how it surfaces. */
const UNIQUE_VIOLATION = "23505";

/**
 * A foreign key was violated. Two distinct situations produce it here, and they are
 * reported differently:
 *
 *   on insert/update  the `venue_id` being written does not exist -> a field error
 *   on delete         child rows still point at this menu -> `deleteInUse`
 */
const FOREIGN_KEY_VIOLATION = "23503";

/**
 * Rebuilds the public pages that render menus: the homepage Menu teaser and the
 * dedicated Menu page, in both locales. A blanket
 * `revalidatePath("/", "layout")` would discard every cached route on the site to
 * publish one menu, which is why it is not used here.
 */
function revalidatePublicMenus(): void {
  revalidatePublicMenu();
}

export async function createMenu(
  _previous: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  await requireAdmin();

  const parsed = parseMenuForm(formData);

  if (!parsed.ok) {
    return { status: "invalid", fields: parsed.errors };
  }

  // The menu must start life under a venue the admin can actually see. The reference check
  // runs here, before the insert, so a tampered form is stopped with a field-level message
  // rather than a database error; the foreign-key constraint is the backstop.
  if (!(await menuVenueExists(parsed.data.venueId))) {
    return { status: "invalid", fields: { venueId: "venueNotFound" } };
  }

  const supabase = await getSupabaseAuthClient();

  const { data, error } = await supabase
    .from("menus")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      venue_id: parsed.data.venueId,
      description: parsed.data.description,
      display_order: parsed.data.displayOrder,
      is_active: parsed.data.isActive,
    })
    .select("id")
    .single();

  if (error || !data) {
    // A venue deleted between the check above and this insert surfaces here as a
    // foreign-key violation; report it on the venue field, where it belongs.
    if (error?.code === FOREIGN_KEY_VIOLATION) {
      return { status: "invalid", fields: { venueId: "venueNotFound" } };
    }

    if (error?.code === UNIQUE_VIOLATION) {
      return { status: "invalid", fields: { slug: "slugInvalid" } };
    }

    console.error(`[admin] menu insert failed: ${error?.message}`, {
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    return { status: "error", error: MENU_ACTION_ERROR.saveFailed };
  }

  revalidatePublicMenus();
  redirect("/admin/menus");
}

export async function updateMenu(
  _previous: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { status: "error", error: MENU_ACTION_ERROR.menuNotFound };
  }

  const parsed = parseMenuForm(formData);

  if (!parsed.ok) {
    return { status: "invalid", fields: parsed.errors };
  }

  const existing = await getAdminMenu(id);

  if (existing.status !== "success") {
    return { status: "error", error: MENU_ACTION_ERROR.menuNotFound };
  }

  if (!(await menuVenueExists(parsed.data.venueId))) {
    return { status: "invalid", fields: { venueId: "venueNotFound" } };
  }

  const supabase = await getSupabaseAuthClient();

  const { error } = await supabase
    .from("menus")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      venue_id: parsed.data.venueId,
      description: parsed.data.description,
      display_order: parsed.data.displayOrder,
      is_active: parsed.data.isActive,
    })
    .eq("id", id);

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { status: "invalid", fields: { venueId: "venueNotFound" } };
    }

    if (error.code === UNIQUE_VIOLATION) {
      return { status: "invalid", fields: { slug: "slugInvalid" } };
    }

    console.error(`[admin] menu update failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { status: "error", error: MENU_ACTION_ERROR.saveFailed };
  }

  revalidatePublicMenus();
  redirect("/admin/menus");
}

/**
 * Flips `is_active`.
 *
 * Reads the current value rather than accepting a desired one from the form. A submitted
 * target would let a stale page overwrite a change made in another tab, and it would also
 * let anyone calling the endpoint set the state directly instead of toggling it.
 */
export async function toggleMenuActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return;
  }

  const existing = await getAdminMenu(id);

  if (existing.status !== "success") {
    return;
  }

  const supabase = await getSupabaseAuthClient();

  const { error } = await supabase
    .from("menus")
    .update({ is_active: !existing.data.is_active })
    .eq("id", id);

  if (error) {
    console.error(`[admin] menu toggle failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return;
  }

  revalidatePublicMenus();
  revalidatePath("/admin/menus");
}

export async function deleteMenu(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/admin/menus");
  }

  const existing = await getAdminMenu(id);

  if (existing.status !== "success") {
    // Already gone, or unreadable. Either way there is nothing to delete.
    redirect("/admin/menus");
  }

  const supabase = await getSupabaseAuthClient();
  const { error } = await supabase.from("menus").delete().eq("id", id);

  if (error) {
    // A foreign-key violation means dependent rows still reference this menu - its main
    // categories, and the categories and items beneath them. Deleting would orphan the
    // whole subtree, so the database refuses; tell the admin why, distinctly from a
    // generic failure. Never redirect to a plain success in this branch: a delete that
    // did not happen must not look like one that did.
    if (error.code === FOREIGN_KEY_VIOLATION) {
      console.error(
        `[admin] menu delete refused for ${id}: ${FOREIGN_KEY_VIOLATION} (referenced by dependent rows)`,
        { code: error.code, details: error.details, hint: error.hint },
      );
      redirect(`/admin/menus?error=${MENU_ACTION_ERROR.deleteInUse}`);
    }

    console.error(`[admin] menu delete failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    redirect(`/admin/menus?error=${MENU_ACTION_ERROR.deleteFailed}`);
  }

  revalidatePublicMenus();
  revalidatePath("/admin/menus");
  redirect("/admin/menus");
}
