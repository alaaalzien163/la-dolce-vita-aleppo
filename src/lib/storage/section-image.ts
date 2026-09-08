import "server-only";

/**
 * Storage for section images.
 *
 * THE BUCKET IS NOT CONFIGURED, AND THAT IS A FINDING, NOT AN OVERSIGHT.
 *
 * The original live-project audit did not identify a section-specific bucket.
 * Uploads therefore remain explicitly configured rather than guessed from another
 * module's storage.
 *
 * The probe is reliable: Supabase Storage answers the public object endpoint with
 * `NoSuchBucket` for a bucket that does not exist and `NoSuchKey` for one that does but
 * lacks the object, and a control name confirmed the distinction.
 *
 * Creating a bucket is out of scope, and writing section images into another module's bucket would
 * be assuming a bucket that is plainly scoped to something else - it would also almost
 * certainly fail that bucket's storage policies, which cannot be read with the
 * publishable key. So this module refuses to guess.
 *
 * TO ENABLE UPLOADS, set `SUPABASE_SECTIONS_BUCKET` to an existing bucket. Nothing else
 * changes: the form already renders the file field, the actions already call through
 * here, and `next.config.ts` already allows `/storage/v1/object/public/**` on the project
 * hostname. Until it is set, the upload field explains that it is unavailable and the
 * rest of the CRUD works normally.
 *
 * This is a server-only value, deliberately not `NEXT_PUBLIC_*`: a bucket name is
 * configuration for server-side writes and has no business in the browser bundle.
 */

import { getSupabaseAuthClient } from "@/lib/supabase/server";

/** Images the admin may upload. Checked against the sniffed bytes, not the declared type. */
const ALLOWED_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

/** 5 MB. Large enough for a hero-scale photograph, small enough to bound a request. */
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

export const STORAGE_ERROR = {
  notConfigured: "storageNotConfigured",
  tooLarge: "imageTooLarge",
  unsupportedType: "imageUnsupportedType",
  uploadFailed: "imageUploadFailed",
} as const;

export type StorageError = (typeof STORAGE_ERROR)[keyof typeof STORAGE_ERROR];

/** Configured bucket, or `null` when uploads are unavailable. */
export function getSectionsBucket(): string | null {
  const value = process.env.SUPABASE_SECTIONS_BUCKET?.trim();
  return value && value.length > 0 ? value : null;
}

export function isImageUploadAvailable(): boolean {
  return getSectionsBucket() !== null;
}

/**
 * Builds the object path for a section image.
 *
 * PATH TRAVERSAL IS IMPOSSIBLE BY CONSTRUCTION rather than by filtering. The prefix comes
 * from a UUID that the database generated, and the filename is discarded entirely - only
 * an extension derived from the verified content type survives, chosen from a fixed map.
 * No part of the admin's input reaches the path, so there is nothing for `../` to appear
 * in and no sanitiser to get wrong.
 *
 * A timestamp makes each upload a new object. Replacing an image therefore never
 * overwrites in place, which matters because CDN and browser caches key on URL: reusing
 * the path would leave the old picture on screen until every cache expired.
 */
function buildObjectPath(sectionId: string, contentType: string): string {
  const extension = ALLOWED_TYPES.get(contentType);

  if (!extension) {
    throw new Error(`Unsupported content type reached path construction: ${contentType}`);
  }

  return `sections/${sectionId}/${Date.now()}.${extension}`;
}

/** Confirms the bytes are one of the permitted image formats. */
async function sniffType(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return SIGNATURES.find((candidate) => candidate.test(head))?.type ?? null;
}

export interface UploadedImage {
  /** Public URL to store in `sections.image_url`. */
  readonly publicUrl: string;
  /** Object path, retained so the upload can be rolled back if the row update fails. */
  readonly path: string;
}

/**
 * Uploads a section image and returns its public URL.
 *
 * Runs through the authenticated client, so the project's storage policies decide whether
 * this admin may write - the same authority that governs table access. No privileged key
 * is involved.
 */
export async function uploadSectionImage(
  sectionId: string,
  file: File,
): Promise<{ ok: true; image: UploadedImage } | { ok: false; error: StorageError }> {
  const bucket = getSectionsBucket();

  if (!bucket) {
    return { ok: false, error: STORAGE_ERROR.notConfigured };
  }

  if (file.size === 0) {
    return { ok: false, error: STORAGE_ERROR.unsupportedType };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false, error: STORAGE_ERROR.tooLarge };
  }

  // The browser-supplied `file.type` is a claim. The bytes are the evidence.
  const contentType = await sniffType(file);

  if (!contentType) {
    return { ok: false, error: STORAGE_ERROR.unsupportedType };
  }

  const supabase = await getSupabaseAuthClient();
  const path = buildObjectPath(sectionId, contentType);

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    // Never overwrite: the path is unique per upload, so a collision would mean
    // something unexpected is happening and should fail loudly.
    upsert: false,
    cacheControl: "31536000",
  });

  if (error) {
    console.error(`[storage] upload to ${bucket}/${path} failed: ${error.message}`);
    return { ok: false, error: STORAGE_ERROR.uploadFailed };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return { ok: true, image: { publicUrl: data.publicUrl, path } };
}

/**
 * Derives the object path from a stored public URL.
 *
 * Returns `null` unless the URL is unmistakably an object in the configured bucket under
 * this section's own prefix. That constraint is the point: deletion is only ever asked to
 * remove something matching `sections/<id>/`, so a tampered or foreign `image_url` cannot
 * turn a section delete into a delete of some other bucket's contents.
 */
export function resolveOwnedObjectPath(sectionId: string, imageUrl: string): string | null {
  const bucket = getSectionsBucket();

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
  const expectedPrefix = `sections/${sectionId}/`;

  // Belt and braces: the prefix must match and no traversal segment may survive.
  if (!path.startsWith(expectedPrefix) || path.includes("..") || path.includes("//")) {
    return null;
  }

  return path;
}

/**
 * Removes a section-owned object. Best-effort by design.
 *
 * Called only after the database has been updated, so a failure here leaves an orphaned
 * file rather than a row pointing at a deleted image. Of the two, a wasted object is the
 * one a visitor never notices; it is logged so it can be swept up later.
 */
export async function deleteOwnedSectionImage(
  sectionId: string,
  imageUrl: string | null,
): Promise<void> {
  if (!imageUrl) {
    return;
  }

  const bucket = getSectionsBucket();
  const path = resolveOwnedObjectPath(sectionId, imageUrl);

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
