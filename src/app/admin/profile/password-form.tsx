"use client";

import { useActionState } from "react";

import { PASSWORD_FORM_IDLE, type PasswordFormState } from "@/app/admin/profile/error-keys";
import { buttonStyles } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import type { PasswordFormValues } from "@/lib/validation/profile";

/**
 * Change-password form.
 *
 * A client component for the same single reason as every other admin form:
 * `useActionState` lands field errors in place. The credential work happens in
 * the Server Action - current-password verification and the update both go
 * through Supabase Auth, and the session is discarded on success.
 *
 * `autoComplete` values are the standard ones for a password change
 * (`current-password`, `new-password`), so managers pick the right fields.
 * Password inputs never display their value and nothing here ever logs one.
 */

export interface PasswordFormLabels {
  readonly changePasswordTitle: string;
  readonly changePasswordDescription: string;
  readonly fieldCurrentPassword: string;
  readonly fieldNewPassword: string;
  readonly fieldConfirmPassword: string;
  readonly hintNewPassword: string;
  readonly savePassword: string;
  readonly savingPassword: string;
  /** Error messages keyed by the server's stable error keys. */
  readonly errors: Readonly<Record<string, string>>;
}

interface PasswordFormProps {
  readonly action: (state: PasswordFormState, formData: FormData) => Promise<PasswordFormState>;
  readonly labels: PasswordFormLabels;
}

interface PasswordFieldProps {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly autoComplete: "current-password" | "new-password";
  readonly hint?: string;
  readonly error: string | undefined;
  readonly pending: boolean;
}

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  hint,
  error,
  pending,
}: PasswordFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="password"
        autoComplete={autoComplete}
        required
        dir="ltr"
        disabled={pending}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          hint ? `${id}-hint${error ? ` ${id}-error` : ""}` : error ? `${id}-error` : undefined
        }
        className={controlStyles()}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-foreground-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordForm({ action, labels }: PasswordFormProps) {
  const [state, formAction, pending] = useActionState(action, PASSWORD_FORM_IDLE);

  const fields: PasswordFormValues = state.status === "invalid" ? (state.fields ?? {}) : {};
  const actionError = state.status === "error" && state.error ? labels.errors[state.error] : null;

  return (
    <form action={formAction} aria-busy={pending} className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">{labels.changePasswordTitle}</h2>
        <p className="mt-1 max-w-measure text-sm text-foreground-muted">
          {labels.changePasswordDescription}
        </p>
      </div>

      <div role="alert" aria-live="polite">
        {actionError ? (
          <p className="rounded-control border border-error/45 bg-error/5 px-4 py-3 text-sm">
            {actionError}
          </p>
        ) : null}
      </div>

      <PasswordField
        id="pwd-current"
        name="currentPassword"
        label={labels.fieldCurrentPassword}
        autoComplete="current-password"
        error={fields.currentPassword ? labels.errors[fields.currentPassword] : undefined}
        pending={pending}
      />
      <PasswordField
        id="pwd-new"
        name="newPassword"
        label={labels.fieldNewPassword}
        autoComplete="new-password"
        hint={labels.hintNewPassword}
        error={fields.newPassword ? labels.errors[fields.newPassword] : undefined}
        pending={pending}
      />
      <PasswordField
        id="pwd-confirm"
        name="confirmPassword"
        label={labels.fieldConfirmPassword}
        autoComplete="new-password"
        error={fields.confirmPassword ? labels.errors[fields.confirmPassword] : undefined}
        pending={pending}
      />

      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className={buttonStyles({ variant: "primary" })}>
          {pending ? labels.savingPassword : labels.savePassword}
        </button>
      </div>
    </form>
  );
}
