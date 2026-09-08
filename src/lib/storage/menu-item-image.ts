import "server-only";

/**
 * Storage for menu-item images, in the existing `menu-images` bucket.
 *
 * THE BUCKET EXISTS AND IS NOT CREATED HERE. `menu-images` was confirmed present on the
 * live project by probing the public object endpoint: Supabase answers `NoSuchKey` for a
 * missing object in a real bucket and `NoSuchBucket` for a bucket that does not exist, and
 * a deliberately invalid control name returned the latter, so the distinction is reliable.
 * This module performs no bucket creation and no DDL of any kind.
 *
 * Objects live under a `menu-items/<id>/` prefix inside that bucket. The prefix is what
 * makes deletion safe: this module will only ever remove an object whose path begins with
 * the prefix belonging to the item being changed, so a bucket shared with other menu
 * content cannot be reached from here.
 *
 * The bucket name is read from `SUPABASE_MENU_ITEMS_BUCKET`, server-only and deliberately
 * not `NEXT_PUBLIC_*`: it is configuration for server-side writes and has no business in
 * the browser bundle. When it is unset the form explains that uploads are unavailable and
 * every other field continues to work, which is the same arrangement Sections uses.
 *
 * Deliberately self-contained. The size limit, format table, and magic-byte signatures
 * duplicate `section-image.ts` rather than importing a shared module, because extracting
 * shared code would mean editing a live-tested module. The duplication is a known cost and
 * is called out in the phase report as a follow-up.
 */

import { getSupabaseAuthClient } from "@/lib/supabase/server";

/** Images the admin may upload. Checked against the sniffed bytes, not the declared type. */
const ALLOWED_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

/** 5 MB, matching the section-image limit so the two cannot diverge silently. */
const MAX_BYTES = 5 * 1024 * 1024;

/** Magic-byte signatures, so a renamed executable cannot pose as a PNG. */
const SIGNATURES: ReadonlyArray<{ type: string; test: (b: Uint8Array) => boolean }> = [
  {
    type: "image/png",
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  { type: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    type: "image/webp",
    test: (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
  {
    // AVIF is ISO-BMFF: a `ftyp` box whose brand starts with "avif" or "avis".
    type: "image/avif",
    test: (b) =>
      b[4] === 0x66 &&
      b[5] === 0x74 &&
      b[6] === 0x79 &&
      b[7] === 0x70 &&
      b[8] === 0x61 &&
      b[9] === 0x76 &&
      b[10] === 0x69 &&
      (b[11] === 0x66 || b[11] === 0x73),
  },
];

export const MENU_ITEM_STORAGE_ERROR = {
  notConfigured: "storageNotConfigured",
  tooLarge: "imageTooLarge",
  unsupportedType: "imageUnsupportedType",
  uploadFailed: "imageUploadFailed",
} as const;

export type MenuItemStorageError =
  (typeof MENU_ITEM_STORAGE_ERROR)[keyof typeof MENU_ITEM_STORAGE_ERROR];

/** Object prefix inside the bucket. Menu items own only what sits below this. */
const OBJECT_ROOT = "menu-items";

/** Configured bucket, or `null` when uploads are unavailable. */
export function getMenuItemsBucket(): string | null {
  const value = process.env.SUPABASE_MENU_ITEMS_BUCKET?.trim();
  return value && value.length > 0 ? value : null;
}

export function isMenuItemImageUploadAvailable(): boolean {
  return getMenuItemsBucket() !== null;
}

/**
 * Builds the object path for a menu-item image.
 *
 * PATH TRAVERSAL IS IMPOSSIBLE BY CONSTRUCTION rather than by filtering. The prefix comes
 * from a UUID the database generated, and the admin's filename is discarded entirely - only
 * an extension derived from the verified content type survives, chosen from a fixed map. No
 * part of the submitted input reaches the path, so there is nothing for `../` to appear in
 * and no sanitiser to get wrong.
 *
 * A timestamp makes every upload a new object, so replacing an image never overwrites in
 * place. That matters because CDN and browser caches key on URL: reusing the path would
 * leave the previous photograph on the menu until every cache expired.
 */
function buildObjectPath(itemId: string, contentType: string): string {
  const extension = ALLOWED_TYPES.get(contentType);

  if (!extension) {
    throw new Error(`Unsupported content type reached path construction: ${contentType}`);
  }

  return `${OBJECT_ROOT}/${itemId}/${Date.now()}.${extension}`;
}

/** Confirms the bytes are one of the permitted image formats. */
async function sniffType(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return SIGNATURES.find((candidate) => candidate.test(head))?.type ?? null;
}

export interface UploadedMenuItemImage {
  /** Public URL to store in `menu_items.image_url`. */
  readonly publicUrl: string;
  /** Object path, retained so the upload can be rolled back if the row update fails. */
  readonly path: string;
}

/**
 * Uploads a menu-item image and returns its public URL.
 *
 * Runs through the authenticated client, so the project's storage policies decide whether
 * this admin may write - the same authority that governs table access. No privileged key is
 * involved and none exists in this project.
 */
export async function uploadMenuItemImage(
  itemId: string,
  file: File,
): Promise<
  { ok: true; image: UploadedMenuItemImage } | { ok: false; error: MenuItemStorageError }
> {
  const bucket = getMenuItemsBucket();

  if (!bucket) {
    return { ok: false, error: MENU_ITEM_STORAGE_ERROR.notConfigured };
  }

  if (file.size === 0) {
    return { ok: false, error: MENU_ITEM_STORAGE_ERROR.unsupportedType };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false, error: MENU_ITEM_STORAGE_ERROR.tooLarge };
  }

  // The browser-supplied `file.type` is a claim. The bytes are the evidence.
  const contentType = await sniffType(file);

  if (!contentType) {
    return { ok: false, error: MENU_ITEM_STORAGE_ERROR.unsupportedType };
  }

  const supabase = await getSupabaseAuthClient();
  const path = buildObjectPath(itemId, contentType);

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    // Never overwrite: the path is unique per upload, so a collision would mean something
    // unexpected is happening and should fail loudly.
    upsert: false,
    cacheControl: "31536000",
  });

  if (error) {
    console.error(`[storage] upload to ${bucket}/${path} failed: ${error.message}`);
    return { ok: false, error: MENU_ITEM_STORAGE_ERROR.uploadFailed };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return { ok: true, image: { publicUrl: data.publicUrl, path } };
}

/**
 * Derives the object path from a stored public URL.
 *
 * Returns `null` unless the URL is unmistakably an object in the configured bucket under
 * this item's own prefix. That constraint is the whole point: deletion is only ever asked to
 * remove something matching `menu-items/<id>/`, so a tampered or foreign `image_url` cannot
 * turn a menu-item delete into a delete of another item's photograph - or of anything else
 * sharing the bucket.
 */
export function resolveOwnedMenuItemObjectPath(itemId: string, imageUrl: string): string | null {
  const bucket = getMenuItemsBucket();

  if (!bucket) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return null;
  }

  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = parsed.pathname.indexOf(marker);

  if (index === -1) {
    return null;
  }

  const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
  const expectedPrefix = `${OBJECT_ROOT}/${itemId}/`;

  // Belt and braces: the prefix must match and no traversal segment may survive decoding.
  if (!path.startsWith(expectedPrefix) || path.includes("..") || path.includes("//")) {
    return null;
  }

  return path;
}

/**
 * Removes a menu-item-owned object. Best-effort by design.
 *
 * Called only after the database has been updated, so a failure here leaves an orphaned file
 * rather than a row pointing at a deleted image. Of the two, a wasted object is the one a
 * visitor never notices; it is logged so it can be swept up later.
 */
export async function deleteOwnedMenuItemImage(
  itemId: string,
  imageUrl: string | null,
): Promise<void> {
  if (!imageUrl) {
    return;
  }

  const bucket = getMenuItemsBucket();
  const path = resolveOwnedMenuItemObjectPath(itemId, imageUrl);

  if (!bucket || !path) {
    // Not ours to delete. An image_url pointing elsewhere is left untouched.
    return;
  }

  const supabase = await getSupabaseAuthClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    console.warn(`[storage] orphaned object ${bucket}/${path}: ${error.message}`);
  }
}
