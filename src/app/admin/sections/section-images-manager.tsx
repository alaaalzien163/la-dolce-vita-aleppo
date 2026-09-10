"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  SECTION_IMAGES_IDLE,
  type SectionImagesState,
} from "@/app/admin/sections/image-error-keys";
import { buttonStyles } from "@/components/ui/button";

export interface SectionImagesLabels {
  readonly title: string;
  readonly description: string;
  readonly uploadLabel: string;
  readonly uploadHint: string;
  readonly removeFile: string;
  readonly upload: string;
  readonly uploading: string;
  readonly uploadSuccess: string;
  readonly uploadPartial: string;
  readonly noImages: string;
  readonly existingHint: string;
  readonly moveUp: string;
  readonly moveDown: string;
  readonly deleteImage: string;
  readonly confirmDelete: string;
  readonly imageNumber: string;
  readonly uploadUnavailableTitle: string;
  readonly uploadUnavailableDescription: string;
  readonly errors: Readonly<Record<string, string>>;
}

export interface AdminSectionImage {
  readonly id: string;
  readonly imageUrl: string;
  readonly displayOrder: number;
  readonly isActive: boolean;
}

interface SectionImagesManagerProps {
  readonly sectionId: string;
  readonly images: readonly AdminSectionImage[];
  readonly labels: SectionImagesLabels;
  readonly uploadAvailable: boolean;
  readonly uploadAction: (
    state: SectionImagesState,
    formData: FormData,
  ) => Promise<SectionImagesState>;
  readonly deleteAction: (formData: FormData) => Promise<void>;
  readonly moveAction: (formData: FormData) => Promise<void>;
}

function DeleteButton({
  action,
  hiddenValue,
  label,
  confirmLabel,
}: {
  readonly action: (formData: FormData) => Promise<void>;
  readonly hiddenValue: string;
  readonly label: string;
  readonly confirmLabel: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!armed) {
          e.preventDefault();
          setArmed(true);
          return;
        }
        setArmed(false);
      }}
    >
      <input type="hidden" name="id" value={hiddenValue} />
      <button
        type="submit"
        disabled={pending}
        className={buttonStyles({ variant: "ghost", size: "sm" })}
        aria-label={label}
        onBlur={() => setArmed(false)}
      >
        {armed ? confirmLabel : label}
      </button>
    </form>
  );
}

function MoveButton({
  action,
  rowId,
  direction,
  label,
  disabled,
}: {
  readonly action: (formData: FormData) => Promise<void>;
  readonly rowId: string;
  readonly direction: "up" | "down";
  readonly label: string;
  readonly disabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <form action={action}>
      <input type="hidden" name="id" value={rowId} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        disabled={pending || disabled}
        className={buttonStyles({ variant: "ghost", size: "sm" })}
        aria-label={label}
      >
        {direction === "up" ? "▲" : "▼"}
      </button>
    </form>
  );
}

/**
 * File input plus its previews. Owns no form and no action - just the pending selection.
 *
 * The parent keys this component on `images.length`, so a successful upload remounts it
 * and drops the spent selection without the parent having to manipulate state in an
 * effect. Object URLs are revoked on unmount through a ref, keeping the cleanup out of
 * the render path.
 */
function PendingUploadPicker({
  disabled,
  labels,
}: {
  readonly disabled: boolean;
  readonly labels: SectionImagesLabels;
}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [objectUrls, setObjectUrls] = useState<string[]>([]);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      for (const url of urlsRef.current) URL.revokeObjectURL(url);
      urlsRef.current = [];
    };
  }, []);

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const added = Array.from(newFiles);
    const urls = added.map((f) => URL.createObjectURL(f));
    urlsRef.current = urlsRef.current.concat(urls);
    setSelectedFiles((prev) => [...prev, ...added]);
    setObjectUrls((prev) => [...prev, ...urls]);
  }, []);

  const removeFile = useCallback(
    (index: number) => {
      const url = objectUrls[index];
      if (url) URL.revokeObjectURL(url);
      urlsRef.current = urlsRef.current.filter((_, i) => i !== index);
      setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
      setObjectUrls((prev) => prev.filter((_, i) => i !== index));
    },
    [objectUrls],
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="section-images-input" className="text-sm font-semibold">
          {labels.uploadLabel}
        </label>
        <p className="mt-1 text-sm text-foreground-muted">{labels.uploadHint}</p>
      </div>

      <input
        id="section-images-input"
        type="file"
        name="images"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        disabled={disabled}
        onChange={(e) => addFiles(e.target.files)}
        className="block w-full text-sm"
      />

      {selectedFiles.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {selectedFiles.map((file, i) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="group relative flex flex-col gap-2"
            >
              <div className="relative aspect-[3/2] w-full overflow-hidden rounded-control border border-border bg-surface-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={objectUrls[i]} alt="" className="h-full w-full object-cover" />
              </div>
              <span className="truncate text-xs text-foreground-muted">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                disabled={disabled}
                className="absolute top-1 right-1 rounded bg-surface/80 p-1 text-xs text-foreground-muted transition-opacity group-hover:opacity-100"
                aria-label={labels.removeFile}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selectedFiles.length > 0 ? (
        <div>
          <button type="submit" disabled={disabled} className={buttonStyles()}>
            {disabled ? labels.uploading : labels.upload}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function SectionImagesManager({
  sectionId,
  images,
  labels,
  uploadAvailable,
  uploadAction,
  deleteAction,
  moveAction,
}: SectionImagesManagerProps) {
  const [uploadState, uploadFormAction, uploadPending] = useActionState(
    uploadAction,
    SECTION_IMAGES_IDLE,
  );

  const actionError =
    uploadState.status === "error" ? (labels.errors[uploadState.error] ?? uploadState.error) : null;

  return (
    <section className="flex flex-col gap-8">
      <header>
        <h2 className="font-semibold">{labels.title}</h2>
        <p className="mt-1 text-sm text-foreground-muted">{labels.description}</p>
      </header>

      {uploadAvailable ? (
        <form action={uploadFormAction} aria-busy={uploadPending} className="flex flex-col gap-4">
          <input type="hidden" name="sectionId" value={sectionId} />

          <div role="alert" aria-live="polite">
            {actionError ? (
              <p className="rounded-control border border-error/45 bg-error/5 px-4 py-3 text-sm">
                {actionError}
              </p>
            ) : null}
            {uploadState.status === "success" ? (
              <p className="rounded-control border border-success/45 bg-success/5 px-4 py-3 text-sm">
                {uploadState.failed > 0 ? labels.uploadPartial : labels.uploadSuccess}
              </p>
            ) : null}
          </div>

          {/* Keyed on the image count: a successful upload grows the list, which remounts
              the picker and drops the stale pending selection. */}
          <PendingUploadPicker key={images.length} disabled={uploadPending} labels={labels} />
        </form>
      ) : (
        <div className="rounded-control border border-dashed border-border-strong/45 px-4 py-3">
          <p className="text-sm font-medium">{labels.uploadUnavailableTitle}</p>
          <p className="mt-1 text-sm text-foreground-muted">
            {labels.uploadUnavailableDescription}
          </p>
        </div>
      )}

      {images.length > 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground-muted">{labels.existingHint}</p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => (
              <li
                key={image.id}
                className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3"
              >
                <div className="relative aspect-[3/2] w-full overflow-hidden rounded-control bg-surface-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex items-center justify-between text-xs text-foreground-muted">
                  <span>{labels.imageNumber.replace("%index%", String(index + 1))}</span>
                  <div className="flex gap-1">
                    {index > 0 ? (
                      <MoveButton
                        action={moveAction}
                        rowId={image.id}
                        direction="up"
                        label={labels.moveUp}
                        disabled={uploadPending}
                      />
                    ) : null}
                    {index < images.length - 1 ? (
                      <MoveButton
                        action={moveAction}
                        rowId={image.id}
                        direction="down"
                        label={labels.moveDown}
                        disabled={uploadPending}
                      />
                    ) : null}
                    <DeleteButton
                      action={deleteAction}
                      hiddenValue={image.id}
                      label={labels.deleteImage}
                      confirmLabel={labels.confirmDelete}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-foreground-muted">{labels.noImages}</p>
      )}
    </section>
  );
}
