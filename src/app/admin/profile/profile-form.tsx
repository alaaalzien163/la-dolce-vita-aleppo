"use client";

import { useActionState } from "react";

import { PROFILE_FORM_IDLE, type ProfileFormState } from "@/app/admin/profile/error-keys";
import { buttonStyles } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import type { AdminProfile } from "@/lib/data/admin/profile";
import type { ProfileFormValues } from "@/lib/validation/profile";

/**
 * Profile details form.
 *
 * A client component for one reason: `useActionState` re-renders in place on a
 * failed submit so field errors land under the fields that caused them. The
 * profile read is server-rendered by the page; the values arrive as defaults.
 *
 * Email and role are read-only and are never submitted - email comes from the
 * verified token claims and role is displayed from the row, while the action
 * accepts only `full_name` and derives `auth.uid()` itself.
 */

export interface ProfileFormLabels {
  readonly profileHeading: string;
  readonly fieldFullName: string;
  readonly hintFullName: string;
  readonly fieldEmail: string;
  readonly fieldRole: string;
  readonly optional: string;
  readonly saveProfile: string;
  readonly savingProfile: string;
  /** Error messages keyed by the server's stable error keys. */
  readonly errors: Readonly<Record<string, string>>;
}

interface ProfileFormProps {
  readonly action: (state: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
  readonly labels: ProfileFormLabels;
  /** Current row values, as read by the page. Absent = never-rendered guard state. */
  readonly profile: AdminProfile;
  /** Email from the verified token claims; `null` when the account has none. */
  readonly email: string | null;
  /** Localized label for `profile.role` when it is the known admin value. */
  readonly roleLabel: string;
}

function describedBy(id: string, hasError: boolean): string {
  return hasError ? `${id}-hint ${id}-error` : `${id}-hint`;
}

export function ProfileForm({ action, labels, profile, email, roleLabel }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(action, PROFILE_FORM_IDLE);

  const fields: ProfileFormValues = state.status === "invalid" ? (state.fields ?? {}) : {};
  const actionError = state.status === "error" && state.error ? labels.errors[state.error] : null;

  return (
    <form action={formAction} aria-busy={pending} className="flex flex-col gap-6">
      <h2 className="text-lg font-medium">{labels.profileHeading}</h2>

      <div role="alert" aria-live="polite">
        {actionError ? (
          <p className="rounded-control border border-error/45 bg-error/5 px-4 py-3 text-sm">
            {actionError}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="profile-full-name" className="text-sm font-semibold">
            {labels.fieldFullName}
            {` ${labels.optional}`}
          </label>
          <input
            id="profile-full-name"
            name="fullName"
            type="text"
            inputMode="text"
            autoComplete="name"
            maxLength={120}
            defaultValue={profile.full_name ?? ""}
            dir="auto"
            disabled={pending}
            aria-invalid={fields.fullName ? true : undefined}
            aria-describedby={describedBy("profile-full-name", Boolean(fields.fullName))}
            className={controlStyles()}
          />
          <p id="profile-full-name-hint" className="text-sm text-foreground-muted">
            {labels.hintFullName}
          </p>
          {fields.fullName ? (
            <p id="profile-full-name-error" role="alert" className="text-sm font-medium text-error">
              {labels.errors[fields.fullName]}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span id="profile-email-label" className="text-sm font-semibold">
            {labels.fieldEmail}
          </span>
          <p
            id="profile-email-value"
            aria-labelledby="profile-email-label"
            className="flex min-h-11 items-center rounded-control border border-border-strong/45 bg-surface-muted px-3.5 py-2.5 text-base text-foreground"
          >
            {/* Email is Latin and order-significant; it must not mirror. */}
            <span dir="ltr">{email ?? "—"}</span>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span id="profile-role-label" className="text-sm font-semibold">
            {labels.fieldRole}
          </span>
          <p
            id="profile-role-value"
            aria-labelledby="profile-role-label"
            className="flex min-h-11 items-center rounded-control border border-border-strong/45 bg-surface-muted px-3.5 py-2.5 text-base text-foreground"
          >
            <span dir="ltr">{roleLabel}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className={buttonStyles({ variant: "primary" })}>
          {pending ? labels.savingProfile : labels.saveProfile}
        </button>
      </div>
    </form>
  );
}
