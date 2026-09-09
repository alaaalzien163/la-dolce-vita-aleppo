"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { MENU_ITEM_ACTION_ERROR, type MenuItemFormState } from "@/app/admin/menu-items/error-keys";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePublicMenu } from "@/lib/cache/public-revalidation";
import { getSupportedMenuItemCurrencies } from "@/lib/constants/menu-item-currency";
import { getAdminMenuItem, menuItemCategoryExists } from "@/lib/data/admin/menu-items";
import {
  deleteOwnedMenuItemImage,
  MENU_ITEM_STORAGE_ERROR,
  uploadMenuItemImage,
} from "@/lib/storage/menu-item-image";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import { parseMenuItemForm } from "@/lib/validation/menu-item";

/**
 * Mutations for `public.menu_items`.
 *
 * EVERY ACTION STARTS WITH `requireAdmin()`. A Server Action is a public HTTP endpoint -
 * reachable by anyone who knows its id, whether or not they ever loaded the page that renders
 * it - so the guard on the page protects the page, not these. Authorization is re-established
 * per call, from the session cookie, against `profiles.role`.
 *
 * Everything runs through the authenticated client, including storage. RLS and the bucket's own
 * policies decide what each statement may touch. There is no service-role key anywhere, no
 * privileged RPC, no DDL, and no second permission system: if a policy would refuse the write,
 * it refuses it.
 *
 * Postgrest errors are logged with their code, details, and hint and never returned. The admin
 * sees an application-level key; the diagnostics stay in the server log where they are useful
 * and where they cannot leak schema detail to a browser.
 */

/** A foreign key was violated. The same code means opposite things by statement:
 *
 *   on insert/update  `category_id` does not exist -> a field error on the selector
 *   on delete         some row still points at this item -> `deleteInUse`
 */
const FOREIGN_KEY_VIOLATION = "23503";

/**
 * Rebuilds the public pages that render menu content: the homepage Menu teaser
 * and the dedicated Menu page, in both locales. A blanket
 * `revalidatePath("/", "layout")` would discard every cached route on the site to
 * publish one dish, which is why it is not used here.
 */
function revalidatePublicMenuContent(): void {
  revalidatePublicMenu();
}

/** The optional file input arrives as an empty `File` when nothing was chosen. */
function readImageFile(formData: FormData): File | null {
  const value = formData.get("image");
  return value instanceof File && value.size > 0 ? value : null;
}

/**
 * Builds the column payload shared by insert and update.
 *
 * `currency` is included only when a supported set is configured and a value was submitted.
 * Omitting the key entirely is what lets the database default apply, which is the only safe
 * behaviour while the column's CHECK constraint is unknown.
 */
function toColumns(data: {
  name: string;
  categoryId: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  displayOrder: number;
  isAvailable: boolean;
  isFeatured: boolean;
}) {
  return {
    name: data.name,
    category_id: data.categoryId,
    description: data.description,
    price: data.price,
    display_order: data.displayOrder,
    is_available: data.isAvailable,
    is_featured: data.isFeatured,
    ...(data.currency === null ? {} : { currency: data.currency }),
  };
}

export async function createMenuItem(
  _previous: MenuItemFormState,
  formData: FormData,
): Promise<MenuItemFormState> {
  await requireAdmin();

  const parsed = parseMenuItemForm(formData, getSupportedMenuItemCurrencies());

  if (!parsed.ok) {
    return { status: "invalid", fields: parsed.errors };
  }

  // The item must start life in a category the admin can actually see. The reference check runs
  // here, before the insert, so a tampered form is stopped with a field-level message rather
  // than a database error; the foreign-key constraint is the backstop.
  if (!(await menuItemCategoryExists(parsed.data.categoryId))) {
    return { status: "invalid", fields: { categoryId: "categoryNotFound" } };
  }

  const supabase = await getSupabaseAuthClient();

  // The row is inserted before the image is uploaded, because the object path is keyed by the
  // item's id and the database is what mints it. A failed upload afterwards leaves an item
  // without a photograph, which is a valid state the admin can retry - the reverse order would
  // leave an orphaned file under an id that never existed.
  const { data, error } = await supabase
    .from("menu_items")
    .insert(toColumns(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === FOREIGN_KEY_VIOLATION) {
      return { status: "invalid", fields: { categoryId: "categoryNotFound" } };
    }

    // No unique constraint is known on this table - it has no slug - so a `23505` cannot be
    // attributed to a field. It is logged with its code and reported as a generic save
    // failure rather than pinned on a guess.
    console.error(`[admin] menu item insert failed: ${error?.message}`, {
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    return { status: "error", error: MENU_ITEM_ACTION_ERROR.saveFailed };
  }

  const file = readImageFile(formData);

  if (file) {
    const upload = await uploadMenuItemImage(data.id, file);

    if (!upload.ok) {
      // The item exists and is usable; only the picture failed. Reported as an error so the
      // admin knows to retry, rather than silently saving without it.
      revalidatePublicMenuContent();
      return { status: "error", error: upload.error };
    }

    const { error: linkError } = await supabase
      .from("menu_items")
      .update({ image_url: upload.image.publicUrl })
      .eq("id", data.id);

    if (linkError) {
      // The row could not be pointed at the object, so the object is not wanted. Removing it
      // here is what stops a successful upload becoming an unreferenced file.
      await deleteOwnedMenuItemImage(data.id, upload.image.publicUrl);
      console.error(`[admin] menu item image link failed: ${linkError.message}`, {
        code: linkError.code,
        details: linkError.details,
        hint: linkError.hint,
      });
      revalidatePublicMenuContent();
      return { status: "error", error: MENU_ITEM_STORAGE_ERROR.uploadFailed };
    }
  }

  revalidatePublicMenuContent();
  redirect("/admin/menu-items");
}

export async function updateMenuItem(
  _previous: MenuItemFormState,
  formData: FormData,
): Promise<MenuItemFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { status: "error", error: MENU_ITEM_ACTION_ERROR.itemNotFound };
  }

  const parsed = parseMenuItemForm(formData, getSupportedMenuItemCurrencies());

  if (!parsed.ok) {
    return { status: "invalid", fields: parsed.errors };
  }

  const existing = await getAdminMenuItem(id);

  if (existing.status !== "success") {
    return { status: "error", error: MENU_ITEM_ACTION_ERROR.itemNotFound };
  }

  if (!(await menuItemCategoryExists(parsed.data.categoryId))) {
    return { status: "invalid", fields: { categoryId: "categoryNotFound" } };
  }

  const supabase = await getSupabaseAuthClient();
  const removeImage = formData.get("removeImage") === "on";
  const file = readImageFile(formData);

  let imageUrl: string | null = existing.data.image_url;
  let uploadedUrl: string | null = null;

  if (file) {
    const upload = await uploadMenuItemImage(id, file);

    if (!upload.ok) {
      return { status: "error", error: upload.error };
    }

    uploadedUrl = upload.image.publicUrl;
    imageUrl = uploadedUrl;
  } else if (removeImage) {
    imageUrl = null;
  }

  const { error } = await supabase
    .from("menu_items")
    .update({ ...toColumns(parsed.data), image_url: imageUrl })
    .eq("id", id);

  if (error) {
    // Roll back the freshly uploaded object: the row still points at the old image, so the new
    // one is unreferenced and would otherwise linger forever.
    if (uploadedUrl) {
      await deleteOwnedMenuItemImage(id, uploadedUrl);
    }

    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { status: "invalid", fields: { categoryId: "categoryNotFound" } };
    }

    console.error(`[admin] menu item update failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { status: "error", error: MENU_ITEM_ACTION_ERROR.saveFailed };
  }

  // Only now is the previous object genuinely unreferenced. Deleting it before the update
  // committed would have broken the live menu if the update then failed.
  const replaced = (file || removeImage) && existing.data.image_url !== imageUrl;

  if (replaced) {
    await deleteOwnedMenuItemImage(id, existing.data.image_url);
  }

  revalidatePublicMenuContent();
  redirect("/admin/menu-items");
}

/**
 * Flips `is_available`.
 *
 * `menu_items` has no `is_active` column; availability is the flag that decides whether a dish
 * is being served, so it is the one the list toggles.
 *
 * Reads the current value rather than accepting a desired one from the form. A submitted target
 * would let a stale page overwrite a change made in another tab, and it would also let anyone
 * calling the endpoint set the state directly instead of toggling it.
 */
export async function toggleMenuItemAvailable(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return;
  }

  const existing = await getAdminMenuItem(id);

  if (existing.status !== "success") {
    return;
  }

  const supabase = await getSupabaseAuthClient();

  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: !existing.data.is_available })
    .eq("id", id);

  if (error) {
    console.error(`[admin] menu item toggle failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return;
  }

  revalidatePublicMenuContent();
  revalidatePath("/admin/menu-items");
}

export async function deleteMenuItem(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/admin/menu-items");
  }

  const existing = await getAdminMenuItem(id);

  if (existing.status !== "success") {
    // Already gone, or unreadable. Either way there is nothing to delete.
    redirect("/admin/menu-items");
  }

  const supabase = await getSupabaseAuthClient();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);

  if (error) {
    // No table in the generated schema references `menu_items`, so this branch is unreachable
    // today. It exists so that a future child table produces the accurate message instead of a
    // generic failure. Either way the success redirect is never reached from here: a delete
    // that did not happen must not look like one that did.
    if (error.code === FOREIGN_KEY_VIOLATION) {
      console.error(
        `[admin] menu item delete refused for ${id}: ${FOREIGN_KEY_VIOLATION} (referenced by dependent rows)`,
        { code: error.code, details: error.details, hint: error.hint },
      );
      redirect(`/admin/menu-items?error=${MENU_ITEM_ACTION_ERROR.deleteInUse}`);
    }

    console.error(`[admin] menu item delete failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    redirect(`/admin/menu-items?error=${MENU_ITEM_ACTION_ERROR.deleteFailed}`);
  }

  // After the row is gone, so a failed delete never strands the menu without its photograph.
  // Scoped to `menu-items/<id>/`, so this cannot reach another item's objects or anything else
  // sharing the bucket.
  await deleteOwnedMenuItemImage(id, existing.data.image_url);

  revalidatePublicMenuContent();
  revalidatePath("/admin/menu-items");
  redirect("/admin/menu-items");
}
