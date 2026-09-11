"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  SECTION_MEDIA_IDLE,
  type SectionMediaState,
} from "@/app/admin/sections/media-error-keys";
import { buttonStyles } from "@/components/ui/button";

export interface SectionMediaLabels {
  readonly title: string;
  readonly description: string;
  readonly uploadLabel: string;
  readonly uploadHint: string;
  readonly videoLabel: string;
  readonly videoHint: string;
  readonly posterLabel: string;
  readonly posterHint: string;
  readonly addVideos: string;
  readonly removeFile: string;
  readonly upload: string;
  readonly uploading: string;
  readonly uploadSuccess: string;
  readonly uploadPartial: string;
  readonly noMedia: string;
  readonly existingHint: string;
  readonly mediaNumber: string;
  readonly mediaTypeImage: string;
  readonly mediaTypeVideo: string;
  readonly activateMedia: string;
  readonly deactivateMedia: string;
  readonly moveUp: string;
  readonly moveDown: string;
  readonly deleteMedia: string;
  readonly confirmDelete: string;
  readonly uploadUnavailableTitle: string;
  readonly uploadUnavailableDescription: string;
  readonly errors: Readonly<Record<string, string>>;
}

export interface AdminSectionMedia {
  readonly id: string;
  readonly mediaUrl: string;
  readonly mediaType: "image" | "video";
  readonly posterUrl: string | null;
  readonly displayOrder: number;
  readonly isActive: boolean;
}

interface SectionMediaManagerProps {
  readonly sectionId: string;
  readonly media: readonly AdminSectionMedia[];
  readonly labels: SectionMediaLabels;
  readonly uploadAvailable: boolean;
  readonly uploadAction: (
    state: SectionMediaState,
    formData: FormData,
  ) => Promise<SectionMediaState>;
  readonly deleteAction: (formData: FormData) => Promise<void>;
  readonly moveAction: (formData: FormData) => Promise<void>;
  readonly toggleAction: (formData: FormData) => Promise<void>;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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

function ToggleActiveButton({
  action,
  rowId,
  isActive,
  activateLabel,
  deactivateLabel,
  disabled,
}: {
  readonly action: (formData: FormData) => Promise<void>;
  readonly rowId: string;
  readonly isActive: boolean;
  readonly activateLabel: string;
  readonly deactivateLabel: string;
  readonly disabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <form action={action}>
      <input type="hidden" name="id" value={rowId} />
      <button
        type="submit"
        disabled={pending || disabled}
        aria-pressed={isActive}
        className={buttonStyles({ variant: "ghost", size: "sm" })}
      >
        {isActive ? deactivateLabel : activateLabel}
      </button>
    </form>
  );
}

/**
 * Image file input plus its pending previews. Reacts only to local selection; the
 * surrounding form submits via the image "Upload" button.
 *
 * The parent keys this on `media.length`, so a successful upload remounts the whole
 * upload section and drops the spent selection without effect-driven state juggling.
 */
function ImageUploader({ disabled, labels }: { disabled: boolean; labels: SectionMediaLabels }) {
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
      <input
        id="section-images-input"
        type="file"
        name="images"
        multiple
        accept={IMAGE_TYPES.join(",")}
        disabled={disabled}
        onChange={(e) => addFiles(e.target.files)}
        className="block w-full text-sm"
      />

      {selectedFiles.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
          <button
            type="submit"
            name="mediaType"
            value="image"
            disabled={disabled}
            className={buttonStyles()}
          >
            {disabled ? labels.uploading : labels.upload}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Video path adder plus optional poster. Paths are relative public asset paths
 * (`/videos/departments/...`) so no binary is uploaded to storage.
 */
function VideoAdder({ disabled, labels }: { disabled: boolean; labels: SectionMediaLabels }) {
  const [poster, setPoster] = useState<{ file: File; url: string } | null>(null);
  const [posterError, setPosterError] = useState<string | null>(null);
  const posterUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (posterUrlRef.current) URL.revokeObjectURL(posterUrlRef.current);
    };
  }, []);

  const selectPoster = useCallback(
    (file: File | null) => {
      if (posterUrlRef.current) {
        URL.revokeObjectURL(posterUrlRef.current);
        posterUrlRef.current = null;
      }
      setPoster(null);

      if (!file) return;

      if (!IMAGE_TYPES.includes(file.type)) {
        setPosterError(labels.errors.imageUnsupportedType ?? null);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setPosterError(labels.errors.imageTooLarge ?? null);
        return;
      }

      posterUrlRef.current = URL.createObjectURL(file);
      setPoster({ file, url: posterUrlRef.current });
      setPosterError(null);
    },
    [labels.errors],
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="section-videos-input" className="text-sm font-medium">
          {labels.videoLabel}
        </label>
        <p className="mt-1 text-sm text-foreground-muted">{labels.videoHint}</p>
      </div>

      <textarea
        id="section-videos-input"
        name="videoPaths"
        rows={3}
        disabled={disabled}
        className="w-full resize-y rounded-control border border-border bg-surface px-3 py-2 text-sm"
      />

      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor="section-videos-poster-input" className="text-sm font-medium">
            {labels.posterLabel}
          </label>
          <p className="mt-1 text-sm text-foreground-muted">{labels.posterHint}</p>
        </div>

        <input
          id="section-videos-poster-input"
          type="file"
          name="poster"
          accept={IMAGE_TYPES.join(",")}
          disabled={disabled}
          onChange={(e) => selectPoster(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />

        {posterError ? (
          <p className="text-sm text-error">{posterError}</p>
        ) : null}

        {poster ? (
          <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-control border border-border bg-surface-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster.url} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
      </div>

      <div>
        <button
          type="submit"
          name="mediaType"
          value="video"
          disabled={disabled}
          className={buttonStyles()}
        >
          {disabled ? labels.uploading : labels.addVideos}
        </button>
      </div>
    </div>
  );
}

export function SectionMediaManager({
  sectionId,
  media,
  labels,
  uploadAvailable,
  uploadAction,
  deleteAction,
  moveAction,
  toggleAction,
}: SectionMediaManagerProps) {
  const [uploadState, uploadFormAction, uploadPending] = useActionState(
    uploadAction,
    SECTION_MEDIA_IDLE,
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

          {/* Keyed on the media count: a successful add grows the list, remounting both
              pickers so stale selections (files, paths, poster) drop on their own. */}
          <div key={media.length} className="flex flex-col gap-6">
            <div className="rounded-card border border-border bg-surface p-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold">{labels.uploadLabel}</h3>
                <p className="text-sm text-foreground-muted">{labels.uploadHint}</p>
              </div>
              <div className="mt-4">
                <ImageUploader disabled={uploadPending} labels={labels} />
              </div>
            </div>

            <div className="rounded-card border border-border bg-surface p-4">
              <VideoAdder disabled={uploadPending} labels={labels} />
            </div>
          </div>
        </form>
      ) : (
        <div className="rounded-control border border-dashed border-border-strong/45 px-4 py-3">
          <p className="text-sm font-medium">{labels.uploadUnavailableTitle}</p>
          <p className="mt-1 text-sm text-foreground-muted">
            {labels.uploadUnavailableDescription}
          </p>
        </div>
      )}

      {media.length > 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground-muted">{labels.existingHint}</p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((item, index) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3"
              >
                <div className="relative aspect-[3/2] w-full overflow-hidden rounded-control bg-surface-muted">
                  {item.mediaType === "video" ? (
                    <video
                      src={item.mediaUrl}
                      poster={item.posterUrl ?? undefined}
                      muted
                      preload="metadata"
                      aria-hidden="true"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.mediaUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-foreground-muted">
                  <span className="flex items-center gap-2">
                    <span>{labels.mediaNumber.replace("%index%", String(index + 1))}</span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[0.7rem]">
                      {item.mediaType === "video" ? labels.mediaTypeVideo : labels.mediaTypeImage}
                    </span>
                  </span>
                  <ToggleActiveButton
                    action={toggleAction}
                    rowId={item.id}
                    isActive={item.isActive}
                    activateLabel={labels.activateMedia}
                    deactivateLabel={labels.deactivateMedia}
                    disabled={uploadPending}
                  />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex gap-1">
                    {index > 0 ? (
                      <MoveButton
                        action={moveAction}
                        rowId={item.id}
                        direction="up"
                        label={labels.moveUp}
                        disabled={uploadPending}
                      />
                    ) : null}
                    {index < media.length - 1 ? (
                      <MoveButton
                        action={moveAction}
                        rowId={item.id}
                        direction="down"
                        label={labels.moveDown}
                        disabled={uploadPending}
                      />
                    ) : null}
                  </div>
                  <DeleteButton
                    action={deleteAction}
                    hiddenValue={item.id}
                    label={labels.deleteMedia}
                    confirmLabel={labels.confirmDelete}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-foreground-muted">{labels.noMedia}</p>
      )}
    </section>
  );
}