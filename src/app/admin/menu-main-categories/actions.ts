"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  MENU_MAIN_CATEGORY_ACTION_ERROR,
  type MenuMainCategoryFormState,
} from "@/app/admin/menu-main-categories/error-keys";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePublicMenu } from "@/lib/cache/public-revalidation";
import {
  getAdminMenuMainCategory,
  mainCategoryMenuExists,
} from "@/lib/data/admin/menu-main-categories";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import { parseMenuMainCategoryForm } from "@/lib/validation/menu-main-category";

/**
 * Mutations for `public.menu_main_categories`.
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
 *   on insert/update  the `menu_id` being written does not exist -> a field error
 *   on delete         child rows still point at this main category -> `deleteInUse`
 */
const FOREIGN_KEY_VIOLATION = "23503";

/**
 * Rebuilds the public pages that render menu content: the homepage Menu teaser
 * and the dedicated Menu page, in both locales. A blanket
 * `revalidatePath("/", "layout")` would discard every cached route on the site to
 * publish one category, which is why it is not used here.
 */
function revalidatePublicMenuContent(): void {
  revalidatePublicMenu();
}

export async function createMenuMainCategory(
  _previous: MenuMainCategoryFormState,
  formData: FormData,
): Promise<MenuMainCategoryFormState> {
  await requireAdmin();

  const parsed = parseMenuMainCategoryForm(formData);

  if (!parsed.ok) {
    return { status: "invalid", fields: parsed.errors };
  }

  // The category must start life under a menu the admin can actually see. The reference
  // check runs here, before the insert, so a tampered form is stopped with a field-level
  // message rather than a database error; the foreign-key constraint is the backstop.
  if (!(await mainCategoryMenuExists(parsed.data.menuId))) {
    return { status: "invalid", fields: { menuId: "menuNotFound" } };
  }

  const supabase = await getSupabaseAuthClient();

  const { data, error } = await supabase
    .from("menu_main_categories")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      menu_id: parsed.data.menuId,
      description: parsed.data.description,
      display_order: parsed.data.displayOrder,
      is_active: parsed.data.isActive,
    })
    .select("id")
    .single();

  if (error || !data) {
    // A menu deleted between the check above and this insert surfaces here as a
    // foreign-key violation; report it on the menu field, where it belongs.
    if (error?.code === FOREIGN_KEY_VIOLATION) {
      return { status: "invalid", fields: { menuId: "menuNotFound" } };
    }

    if (error?.code === UNIQUE_VIOLATION) {
      return { status: "invalid", fields: { slug: "slugInvalid" } };
    }

    console.error(`[admin] main category insert failed: ${error?.message}`, {
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    return { status: "error", error: MENU_MAIN_CATEGORY_ACTION_ERROR.saveFailed };
  }

  revalidatePublicMenuContent();
  redirect("/admin/menu-main-categories");
}

export async function updateMenuMainCategory(
  _previous: MenuMainCategoryFormState,
  formData: FormData,
): Promise<MenuMainCategoryFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { status: "error", error: MENU_MAIN_CATEGORY_ACTION_ERROR.mainCategoryNotFound };
  }

  const parsed = parseMenuMainCategoryForm(formData);

  if (!parsed.ok) {
    return { status: "invalid", fields: parsed.errors };
  }

  const existing = await getAdminMenuMainCategory(id);

  if (existing.status !== "success") {
    return { status: "error", error: MENU_MAIN_CATEGORY_ACTION_ERROR.mainCategoryNotFound };
  }

  if (!(await mainCategoryMenuExists(parsed.data.menuId))) {
    return { status: "invalid", fields: { menuId: "menuNotFound" } };
  }

  const supabase = await getSupabaseAuthClient();

  const { error } = await supabase
    .from("menu_main_categories")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      menu_id: parsed.data.menuId,
      description: parsed.data.description,
      display_order: parsed.data.displayOrder,
      is_active: parsed.data.isActive,
    })
    .eq("id", id);

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { status: "invalid", fields: { menuId: "menuNotFound" } };
    }

    if (error.code === UNIQUE_VIOLATION) {
      return { status: "invalid", fields: { slug: "slugInvalid" } };
    }

    console.error(`[admin] main category update failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { status: "error", error: MENU_MAIN_CATEGORY_ACTION_ERROR.saveFailed };
  }

  revalidatePublicMenuContent();
  redirect("/admin/menu-main-categories");
}

/**
 * Flips `is_active`.
 *
 * Reads the current value rather than accepting a desired one from the form. A submitted
 * target would let a stale page overwrite a change made in another tab, and it would also
 * let anyone calling the endpoint set the state directly instead of toggling it.
 */
export async function toggleMenuMainCategoryActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return;
  }

  const existing = await getAdminMenuMainCategory(id);

  if (existing.status !== "success") {
    return;
  }

  const supabase = await getSupabaseAuthClient();

  const { error } = await supabase
    .from("menu_main_categories")
    .update({ is_active: !existing.data.is_active })
    .eq("id", id);

  if (error) {
    console.error(`[admin] main category toggle failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return;
  }

  revalidatePublicMenuContent();
  revalidatePath("/admin/menu-main-categories");
}

export async function deleteMenuMainCategory(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/admin/menu-main-categories");
  }

  const existing = await getAdminMenuMainCategory(id);

  if (existing.status !== "success") {
    // Already gone, or unreadable. Either way there is nothing to delete.
    redirect("/admin/menu-main-categories");
  }

  const supabase = await getSupabaseAuthClient();
  const { error } = await supabase.from("menu_main_categories").delete().eq("id", id);

  if (error) {
    // A foreign-key violation means dependent rows still reference this main category - its
    // `menu_categories`, and the items beneath them. Deleting would orphan the whole
    // subtree, so the database refuses; tell the admin why, distinctly from a generic
    // failure. Never redirect to a plain success in this branch: a delete that did not
    // happen must not look like one that did.
    if (error.code === FOREIGN_KEY_VIOLATION) {
      console.error(
        `[admin] main category delete refused for ${id}: ${FOREIGN_KEY_VIOLATION} (referenced by dependent rows)`,
        { code: error.code, details: error.details, hint: error.hint },
      );
      redirect(`/admin/menu-main-categories?error=${MENU_MAIN_CATEGORY_ACTION_ERROR.deleteInUse}`);
    }

    console.error(`[admin] main category delete failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    redirect(`/admin/menu-main-categories?error=${MENU_MAIN_CATEGORY_ACTION_ERROR.deleteFailed}`);
  }

  revalidatePublicMenuContent();
  revalidatePath("/admin/menu-main-categories");
  redirect("/admin/menu-main-categories");
}
