"use client";

import { useActionState } from "react";

import {
  SITE_SETTINGS_FORM_IDLE,
  type SiteSettingsFormState,
} from "@/app/admin/settings/error-keys";
import { buttonStyles } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import type { AdminSiteSettings } from "@/lib/data/admin/site-settings";
import type { SiteSettingsFormValues } from "@/lib/validation/site-settings";

/**
 * The settings form.
 *
 * A client component for one reason: `useActionState` re-renders the page in
 * place on a failed submit, so field errors land next to the fields that caused
 * them and the server redirect on success does the rest. Every string is passed
 * in; the form has no provider of its own and renders nothing until the page
 * has resolved the locale.
 *
 * No hidden id field exists. The action resolves the singleton itself, so this
 * form cannot target a row it was never shown and a stale form keeps operating
 * on whatever row exists at submit time.
 *
 * Direction is per-field, not inherited from the page. `dir="auto"` lets the
 * brand name read naturally; `lang="ar" dir="rtl"` makes Arabic content fields
 * mirror; and phone and URLs stay `ltr` because their order is
 * significant no matter the surrounding script.
 */

export interface SiteSettingsFormLabels {
  readonly siteName: string;
  readonly tagline: string;
  readonly phone: string;
  readonly email: string;
  readonly address: string;
  readonly googleMapsUrl: string;
  readonly instagramUrl: string;
  readonly hintSiteName: string;
  readonly hintTagline: string;
  readonly hintPhone: string;
  readonly hintEmail: string;
  readonly hintAddress: string;
  readonly hintGoogleMapsUrl: string;
  readonly hintInstagramUrl: string;
  readonly legendIdentity: string;
  readonly legendContact: string;
  readonly optional: string;
  readonly save: string;
  readonly saving: string;
  /** Error messages keyed by the server's stable error keys. */
  readonly errors: Readonly<Record<string, string>>;
}

interface SiteSettingsFormProps {
  readonly action: (
    state: SiteSettingsFormState,
    formData: FormData,
  ) => Promise<SiteSettingsFormState>;
  readonly labels: SiteSettingsFormLabels;
  /** Absent when the singleton has never been saved. */
  readonly settings?: AdminSiteSettings;
}

/** The helper elements a control describes, present or not. */
function describedBy(id: string, hasError: boolean): string {
  return hasError ? `${id}-hint ${id}-error` : `${id}-hint`;
}

interface TextFieldProps {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly hint: string;
  readonly error: string | undefined;
  readonly value: string;
  readonly dir?: "ltr" | "rtl" | "auto";
  readonly lang?: string;
  readonly inputMode: "text" | "tel" | "email" | "url";
  readonly maxLength?: number;
  readonly optional?: boolean;
  /** Label text for the "(optional)" marker, when set. */
  readonly optionalLabel?: string;
  readonly required?: boolean;
  readonly pending: boolean;
}

function TextField({
  id,
  name,
  label,
  hint,
  error,
  value,
  dir,
  lang,
  inputMode,
  maxLength,
  optional,
  optionalLabel,
  required,
  pending,
}: TextFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {optional && optionalLabel ? (
          <span className="font-normal text-foreground-muted"> {`(${optionalLabel})`}</span>
        ) : null}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        inputMode={inputMode}
        maxLength={maxLength}
        required={required}
        defaultValue={value}
        dir={dir}
        lang={lang}
        disabled={pending}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, Boolean(error))}
        className={controlStyles()}
      />
      <p id={`${id}-hint`} className="text-sm text-foreground-muted">
        {hint}
      </p>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SettingsForm({ action, labels, settings }: SiteSettingsFormProps) {
  const [state, formAction, pending] = useActionState(action, SITE_SETTINGS_FORM_IDLE);

  const fieldErrors: SiteSettingsFormValues =
    state.status === "invalid" ? (state.fields ?? {}) : {};
  const actionError = state.status === "error" && state.error ? labels.errors[state.error] : null;

  const current = settings ?? null;

  const field = {
    siteName: current?.site_name ?? "",
    tagline: current?.tagline ?? "",
    phone: current?.phone ?? "",
    email: current?.email ?? "",
    address: current?.address ?? "",
    googleMapsUrl: current?.google_maps_url ?? "",
    instagramUrl: current?.instagram_url ?? "",
  };

  return (
    <form action={formAction} aria-busy={pending} className="flex max-w-160 flex-col gap-8">
      <div role="alert">
        {actionError ? (
          <p className="rounded-control border border-error/45 bg-error/5 px-4 py-3 text-sm">
            {actionError}
          </p>
        ) : null}
      </div>

      <fieldset className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <legend className="border-b border-border pb-3 text-sm font-semibold">
          {labels.legendIdentity}
        </legend>

        <TextField
          id="ss-site-name"
          name="siteName"
          inputMode="text"
          maxLength={160}
          required
          label={labels.siteName}
          hint={labels.hintSiteName}
          error={fieldErrors.siteName ? labels.errors[fieldErrors.siteName] : undefined}
          value={field.siteName}
          dir="auto"
          pending={pending}
        />
        <TextField
          id="ss-tagline"
          name="tagline"
          inputMode="text"
          maxLength={300}
          optional
          optionalLabel={labels.optional}
          label={labels.tagline}
          hint={labels.hintTagline}
          error={fieldErrors.tagline ? labels.errors[fieldErrors.tagline] : undefined}
          value={field.tagline}
          lang="ar"
          dir="rtl"
          pending={pending}
        />
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <legend className="border-b border-border pb-3 text-sm font-semibold">
          {labels.legendContact}
        </legend>

        <TextField
          id="ss-phone"
          name="phone"
          inputMode="tel"
          maxLength={60}
          optional
          optionalLabel={labels.optional}
          label={labels.phone}
          hint={labels.hintPhone}
          error={fieldErrors.phone ? labels.errors[fieldErrors.phone] : undefined}
          value={field.phone}
          dir="ltr"
          pending={pending}
        />
        <TextField
          id="ss-email"
          name="email"
          inputMode="text"
          maxLength={254}
          optional
          optionalLabel={labels.optional}
          label={labels.email}
          hint={labels.hintEmail}
          error={fieldErrors.email ? labels.errors[fieldErrors.email] : undefined}
          value={field.email}
          dir="ltr"
          pending={pending}
        />
        <TextField
          id="ss-address"
          name="address"
          inputMode="text"
          maxLength={500}
          optional
          optionalLabel={labels.optional}
          label={labels.address}
          hint={labels.hintAddress}
          error={fieldErrors.address ? labels.errors[fieldErrors.address] : undefined}
          value={field.address}
          lang="ar"
          dir="rtl"
          pending={pending}
        />
        <TextField
          id="ss-maps"
          name="googleMapsUrl"
          inputMode="url"
          maxLength={2048}
          optional
          optionalLabel={labels.optional}
          label={labels.googleMapsUrl}
          hint={labels.hintGoogleMapsUrl}
          error={fieldErrors.googleMapsUrl ? labels.errors[fieldErrors.googleMapsUrl] : undefined}
          value={field.googleMapsUrl}
          dir="ltr"
          pending={pending}
        />
        <TextField
          id="ss-instagram"
          name="instagramUrl"
          inputMode="url"
          maxLength={2048}
          optional
          optionalLabel={labels.optional}
          label={labels.instagramUrl}
          hint={labels.hintInstagramUrl}
          error={fieldErrors.instagramUrl ? labels.errors[fieldErrors.instagramUrl] : undefined}
          value={field.instagramUrl}
          dir="ltr"
          pending={pending}
        />
      </fieldset>

      <div className="flex items-center gap-4">
        <button type="submit" className={buttonStyles({ variant: "primary" })} disabled={pending}>
          {pending ? labels.saving : labels.save}
        </button>
      </div>
    </form>
  );
}
