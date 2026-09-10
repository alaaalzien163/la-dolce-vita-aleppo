import "server-only";

/**
 * Storage for section images.
 *
 * The bucket name is read from `SUPABASE_SECTIONS_BUCKET` (currently `section-images`
 * in `.env.local`) and is deliberately not `NEXT_PUBLIC_*`: a bucket name is
 * configuration for server-side writes and has no business in the browser bundle.
 * `next.config.ts` already allows `/storage/v1/object/public/**` on the project
 * hostname, so public URLs serve without an optimizer bypass.
 *
 * Images are uploaded in batches - one Storage object and one `section_images` row per
 * file - and each batch is independent of the section's other fields. The actions map
 * the uploaded objects to rows; on a failed insert this module's callers roll the
 * objects back with `deleteOwnedSectionImage`.
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
 * A timestamp plus a per-batch sequence makes every upload a new object even within one
 * multi-file request. Replacing an image therefore never overwrites in place, which
 * matters because CDN and browser caches key on URL: reusing the path would leave the
 * old picture on screen until every cache expired.
 */
function buildObjectPath(sectionId: string, contentType: string, sequence: number): string {
  const extension = ALLOWED_TYPES.get(contentType);

  if (!extension) {
    throw new Error(`Unsupported content type reached path construction: ${contentType}`);
  }

  return `${sectionId}/${Date.now()}-${sequence}.${extension}`;
}

/** Confirms the bytes are one of the permitted image formats. */
async function sniffType(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return SIGNATURES.find((candidate) => candidate.test(head))?.type ?? null;
}

export interface UploadedImage {
  /** Public URL to store in `section_images.image_url`. */
  readonly publicUrl: string;
  /** Object path, retained so the upload can be rolled back if the row insert fails. */
  readonly path: string;
}

/** One file the batch rejected, with the reason key and its position in the selection. */
export interface SectionImageFailure {
  readonly index: number;
  readonly fileName: string;
  readonly error: StorageError;
}

export interface UploadSectionImagesResult {
  readonly uploaded: readonly UploadedImage[];
  readonly failures: readonly SectionImageFailure[];
}

/**
 * Determines whether a file is acceptable and, if so, which (sniffed) content type it is.
 *
 * The browser-supplied `file.type` is a claim. The bytes are the evidence.
 */
async function inspectFile(
  file: File,
): Promise<{ ok: true; contentType: string } | { ok: false; error: StorageError }> {
  if (file.size > 0 && file.size > MAX_BYTES) {
    return { ok: false, error: STORAGE_ERROR.tooLarge };
  }

  const contentType = await sniffType(file);

  if (!contentType) {
    return { ok: false, error: STORAGE_ERROR.unsupportedType };
  }

  return { ok: true, contentType };
}

/**
 * Uploads a batch of section images, one object per file.
 *
 * Files are validated and uploaded independently so one bad file cannot block the rest
 * of the selection. Each failure is reported with its own key; the callers surface those
 * keys beside the file they named. Every upload runs through the authenticated client so
 * the project's storage policies decide whether this admin may write - the same
 * authority that governs table access. No privileged key is involved.
 */
export async function uploadSectionImages(
  sectionId: string,
  files: readonly File[],
): Promise<UploadSectionImagesResult> {
  const bucket = getSectionsBucket();

  if (!bucket) {
    return {
      uploaded: [],
      failures: files.map((file, index) => ({
        index,
        fileName: file.name,
        error: STORAGE_ERROR.notConfigured,
      })),
    };
  }

  const supabase = await getSupabaseAuthClient();
  const uploaded: UploadedImage[] = [];
  const failures: SectionImageFailure[] = [];

  for (const [index, file] of files.entries()) {
    const inspected = await inspectFile(file);

    if (!inspected.ok) {
      failures.push({ index, fileName: file.name, error: inspected.error });
      continue;
    }

    const path = buildObjectPath(sectionId, inspected.contentType, index + 1);

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: inspected.contentType,
      // Never overwrite: the path is unique per upload, so a collision would mean
      // something unexpected is happening and should fail loudly.
      upsert: false,
      cacheControl: "31536000",
    });

    if (error) {
      console.error(`[storage] upload to ${bucket}/${path} failed: ${error.message}`);
      failures.push({ index, fileName: file.name, error: STORAGE_ERROR.uploadFailed });
      continue;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    uploaded.push({ publicUrl: data.publicUrl, path });
  }

  return { uploaded, failures };
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
  // New uploads live under `sections/<id>/`-free `<id>/`; a few legacy objects from the
  // old single-image flow still sit under `sections/<id>/`. Both are owned by the section.
  const expectedPrefix = `${sectionId}/`;
  const legacyPrefix = `sections/${sectionId}/`;

  // Belt and braces: the prefix must match and no traversal segment may survive.
  if (
    (!path.startsWith(expectedPrefix) && !path.startsWith(legacyPrefix)) ||
    path.includes("..") ||
    path.includes("//")
  ) {
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
