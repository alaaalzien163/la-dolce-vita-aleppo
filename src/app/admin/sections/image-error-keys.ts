import type { StorageError } from "@/lib/storage/section-image";

/**
 * Error keys and form state for the section image manager actions.
 *
 * Mirrors the pattern of `error-keys.ts` for the section field form, but scoped to
 * multi-image upload, delete, and reorder. The same rule applies: keys, not sentences,
 * resolved by the component that has a translator.
 */

export const SECTION_IMAGE_ERROR = {
  noFiles: "noFiles",
  notFound: "notFound",
  insertFailed: "insertFailed",
  deleteFailed: "deleteFailed",
  reorderFailed: "reorderFailed",
} as const;

export type SectionImageActionError =
  (typeof SECTION_IMAGE_ERROR)[keyof typeof SECTION_IMAGE_ERROR] | StorageError;

/** One file that failed validation or upload, for client-side reporting. */
export interface SectionImageFileError {
  readonly name: string;
  readonly error: StorageError;
}

/**
 * What the image manager renders after a batch upload submission.
 *
 * `success` carries counts so the manager can report partial failures; `error`
 * carries the general key plus the per-file detail when applicable.
 */
export type SectionImagesState =
  | { readonly status: "idle" }
  | {
      readonly status: "success";
      readonly uploaded: number;
      readonly failed: number;
    }
  | {
      readonly status: "error";
      readonly error: SectionImageActionError;
      readonly failedFiles: readonly SectionImageFileError[];
    };

export const SECTION_IMAGES_IDLE: SectionImagesState = { status: "idle" };
