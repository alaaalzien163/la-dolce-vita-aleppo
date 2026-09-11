import type { StorageError } from "@/lib/storage/section-image";

/**
 * Error keys and form state for the section media manager actions.
 *
 * Mirrors the pattern of `error-keys.ts` for the section field form, but scoped to
 * image/video upload, delete, reorder, and activation. The same rule applies: keys,
 * not sentences, resolved by the component that has a translator.
 */

export const SECTION_MEDIA_ERROR = {
  noFiles: "noFiles",
  noVideos: "noVideos",
  invalidVideoPath: "invalidVideoPath",
  notFound: "notFound",
  insertFailed: "insertFailed",
  deleteFailed: "deleteFailed",
  reorderFailed: "reorderFailed",
} as const;

export type SectionMediaActionError =
  (typeof SECTION_MEDIA_ERROR)[keyof typeof SECTION_MEDIA_ERROR] | StorageError;

/** One file that failed validation or upload, for client-side reporting. */
export interface SectionMediaFileError {
  readonly name: string;
  readonly error: StorageError;
}

/**
 * What the media manager renders after a batch upload submission.
 *
 * `success` carries counts so the manager can report partial failures; `error`
 * carries the general key plus the per-file detail when applicable.
 */
export type SectionMediaState =
  | { readonly status: "idle" }
  | {
      readonly status: "success";
      readonly uploaded: number;
      readonly failed: number;
    }
  | {
      readonly status: "error";
      readonly error: SectionMediaActionError;
      readonly failedFiles: readonly SectionMediaFileError[];
    };

export const SECTION_MEDIA_IDLE: SectionMediaState = { status: "idle" };