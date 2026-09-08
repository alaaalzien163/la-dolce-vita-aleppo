"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  MENU_CATEGORY_ACTION_ERROR,
  type MenuCategoryFormState,
} from "@/app/admin/menu-categories/error-keys";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePublicMenu } from "@/lib/cache/public-revalidation";
import { categoryMainCategoryExists, getAdminMenuCategory } from "@/lib/data/admin/menu-categories";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import { parseMenuCategoryForm } from "@/lib/validation/menu-category";

/**
 * Mutations for `public.menu_categories`.
 *
 * EVERY ACTION STARTS WITH `requireAdmin()`. A Server Action is a public HTTP endpoint -
 * reachable by anyone who knows its id, whether or not they ever loaded the page that
 * renders it - so the guard on the page protects the page, not these. Authorization is
 * re-established per call, from the session cookie, against `profiles.role`.
 *
 * Everything runs through the authenticated client, so RLS decides what each statement may
 * touch. There is no service-role key anywhere, no privileged RPC, no DDL, and no second
 * permission system: if a policy would refuse the write, it refuses it.
 *
 * Postgrest errors are logged with their code, details, and hint and never returned. The
 * admin sees an application-level key; the diagnostics stay in the server log where they are
 * useful and where they cannot leak schema detail to a browser.
 */

/** Uniqueness is enforced by a database constraint; this is how it surfaces. */
const UNIQUE_VIOLATION = "23505";

/**
 * A foreign key was violated. This table sits between two of them, and the same code means
 * opposite things depending on the statement:
 *
 *   on insert/update  `main_category_id` does not exist -> a field error on the selector
 *   on delete         `menu_items` still point at this category -> `deleteInUse`
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

export async function createMenuCategory(
  _previous: MenuCategoryFormState,
  formData: FormData,
): Promise<MenuCategoryFormState> {
  await requireAdmin();

  const parsed = parseMenuCategoryForm(formData);

  if (!parsed.ok) {
    return { status: "invalid", fields: parsed.errors };
  }

  // The category must start life under a main category the admin can actually see. The
  // reference check runs here, before the insert, so a tampered form is stopped with a
  // field-level message rather than a database error; the constraint is the backstop.
  if (!(await categoryMainCategoryExists(parsed.data.mainCategoryId))) {
    return { status: "invalid", fields: { mainCategoryId: "mainCategoryNotFound" } };
  }

  const supabase = await getSupabaseAuthClient();

  const { data, error } = await supabase
    .from("menu_categories")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      main_category_id: parsed.data.mainCategoryId,
      description: parsed.data.description,
      display_order: parsed.data.displayOrder,
      is_active: parsed.data.isActive,
    })
    .select("id")
    .single();

  if (error || !data) {
    // A parent deleted between the check above and this insert surfaces here as a
    // foreign-key violation; report it on the selector, where it belongs.
    if (error?.code === FOREIGN_KEY_VIOLATION) {
      return { status: "invalid", fields: { mainCategoryId: "mainCategoryNotFound" } };
    }

    if (error?.code === UNIQUE_VIOLATION) {
      return { status: "invalid", fields: { slug: "slugInvalid" } };
    }

    console.error(`[admin] menu category insert failed: ${error?.message}`, {
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    return { status: "error", error: MENU_CATEGORY_ACTION_ERROR.saveFailed };
  }

  revalidatePublicMenuContent();
  redirect("/admin/menu-categories");
}

export async function updateMenuCategory(
  _previous: MenuCategoryFormState,
  formData: FormData,
): Promise<MenuCategoryFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { status: "error", error: MENU_CATEGORY_ACTION_ERROR.categoryNotFound };
  }

  const parsed = parseMenuCategoryForm(formData);

  if (!parsed.ok) {
    return { status: "invalid", fields: parsed.errors };
  }

  const existing = await getAdminMenuCategory(id);

  if (existing.status !== "success") {
    return { status: "error", error: MENU_CATEGORY_ACTION_ERROR.categoryNotFound };
  }

  if (!(await categoryMainCategoryExists(parsed.data.mainCategoryId))) {
    return { status: "invalid", fields: { mainCategoryId: "mainCategoryNotFound" } };
  }

  const supabase = await getSupabaseAuthClient();

  const { error } = await supabase
    .from("menu_categories")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      main_category_id: parsed.data.mainCategoryId,
      description: parsed.data.description,
      display_order: parsed.data.displayOrder,
      is_active: parsed.data.isActive,
    })
    .eq("id", id);

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { status: "invalid", fields: { mainCategoryId: "mainCategoryNotFound" } };
    }

    if (error.code === UNIQUE_VIOLATION) {
      return { status: "invalid", fields: { slug: "slugInvalid" } };
    }

    console.error(`[admin] menu category update failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { status: "error", error: MENU_CATEGORY_ACTION_ERROR.saveFailed };
  }

  revalidatePublicMenuContent();
  redirect("/admin/menu-categories");
}

/**
 * Flips `is_active`.
 *
 * Reads the current value rather than accepting a desired one from the form. A submitted
 * target would let a stale page overwrite a change made in another tab, and it would also
 * let anyone calling the endpoint set the state directly instead of toggling it.
 */
export async function toggleMenuCategoryActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return;
  }

  const existing = await getAdminMenuCategory(id);

  if (existing.status !== "success") {
    return;
  }

  const supabase = await getSupabaseAuthClient();

  const { error } = await supabase
    .from("menu_categories")
    .update({ is_active: !existing.data.is_active })
    .eq("id", id);

  if (error) {
    console.error(`[admin] menu category toggle failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return;
  }

  revalidatePublicMenuContent();
  revalidatePath("/admin/menu-categories");
}

export async function deleteMenuCategory(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/admin/menu-categories");
  }

  const existing = await getAdminMenuCategory(id);

  if (existing.status !== "success") {
    // Already gone, or unreadable. Either way there is nothing to delete.
    redirect("/admin/menu-categories");
  }

  const supabase = await getSupabaseAuthClient();
  const { error } = await supabase.from("menu_categories").delete().eq("id", id);

  if (error) {
    // A foreign-key violation means `menu_items` still reference this category. Deleting
    // would orphan them, so the database refuses; tell the admin exactly what is holding it,
    // distinctly from a generic failure. Never fall through to the success redirect in this
    // branch: a delete that did not happen must not look like one that did.
    if (error.code === FOREIGN_KEY_VIOLATION) {
      console.error(
        `[admin] menu category delete refused for ${id}: ${FOREIGN_KEY_VIOLATION} (menu items still reference it)`,
        { code: error.code, details: error.details, hint: error.hint },
      );
      redirect(`/admin/menu-categories?error=${MENU_CATEGORY_ACTION_ERROR.deleteInUse}`);
    }

    console.error(`[admin] menu category delete failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    redirect(`/admin/menu-categories?error=${MENU_CATEGORY_ACTION_ERROR.deleteFailed}`);
  }

  revalidatePublicMenuContent();
  revalidatePath("/admin/menu-categories");
  redirect("/admin/menu-categories");
}
