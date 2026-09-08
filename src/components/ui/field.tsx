import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Wiring a control needs in order to be correctly labelled and described. */
export interface FieldControlProps {
  readonly id: string;
  readonly "aria-describedby": string | undefined;
  readonly "aria-invalid": true | undefined;
  readonly required: boolean | undefined;
}

interface FieldProps {
  /** Must be unique on the page; used for `label[for]` and the control's `id`. */
  readonly id: string;
  readonly label: string;
  /** Help text rendered before the control is used. */
  readonly hint?: string;
  /** Validation message. Its presence is what marks the control invalid. */
  readonly error?: string;
  readonly required?: boolean;
  /** Visible text marking a field as optional, when `required` is false. */
  readonly optionalLabel?: string;
  readonly className?: string;
  readonly children: (control: FieldControlProps) => ReactNode;
}

/**
 * Accessible form-field scaffold.
 *
 * A render prop hands the control its `id` and ARIA wiring instead of cloning a
 * child element, so the relationship is explicit and type-checked, and `Input`
 * and `Textarea` stay unaware of labelling entirely.
 *
 * Guarantees:
 * - a real `<label for>`, never a placeholder standing in for a label
 * - `aria-describedby` points at the hint, the error, or both, in reading order
 * - `aria-invalid` is derived from `error`, so the two cannot disagree
 * - the error carries `role="alert"` so it is announced when it appears
 * - "required" is conveyed by the `required` attribute and visible text, not by a
 *   bare asterisk
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  optionalLabel,
  className,
  children,
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
        {!required && optionalLabel ? (
          <span className="ms-1.5 font-normal text-foreground-muted">({optionalLabel})</span>
        ) : null}
      </label>

      {hint ? (
        <p id={hintId} className="text-sm text-foreground-muted">
          {hint}
        </p>
      ) : null}

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        required: required ?? undefined,
      })}

      {error ? (
        <p id={errorId} role="alert" className="text-sm font-semibold text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
