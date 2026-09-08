"use client";

import { useActionState } from "react";

import { signInAdmin, type SignInState } from "@/app/admin/actions";
import { buttonStyles } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";

/**
 * Admin sign-in form.
 *
 * A Client Component for one reason: `useActionState` supplies the pending flag and
 * the error from the Server Action, which is what drives the disabled state and the
 * message. Everything security-relevant - credential check, role lookup, session
 * cookies, the sign-out of a rejected account - happens in the action on the server.
 * No Supabase client is constructed here.
 *
 * Labels arrive as props rather than through `useTranslations`, because no
 * `NextIntlClientProvider` is rendered anywhere in this project. That keeps the
 * message catalogues out of the client bundle.
 *
 * ACCESSIBILITY:
 *   - a real `<form>`, so Enter submits and the browser's own validation applies
 *   - every input has a bound `<label>`, not a placeholder standing in for one
 *   - `autoComplete="email"` and `"current-password"` let password managers work
 *   - the error is in a `role="alert"` region referenced by `aria-describedby`, so it
 *     is announced when it appears and reachable when moving through the fields
 *   - `aria-invalid` marks both fields after a failure, which also drives the border
 *     colour, so the visual and accessible states cannot disagree
 *   - the pending state changes the button's text as well as disabling it; a disabled
 *     control with unchanged wording tells a screen reader nothing
 *   - `aria-busy` on the form communicates the in-flight submit
 *
 * There is no sign-up link, no password reset, and no registration path. The single
 * admin account already exists and this form's only job is to let it in.
 */

const INITIAL_STATE: SignInState = { status: "idle" };

export interface LoginFormLabels {
  readonly email: string;
  readonly password: string;
  readonly submit: string;
  readonly submitting: string;
  readonly invalidCredentials: string;
  readonly notAuthorized: string;
  readonly unexpectedError: string;
}

interface LoginFormProps {
  readonly labels: LoginFormLabels;
}

const ERROR_REGION_ID = "admin-login-error";

export function LoginForm({ labels }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(signInAdmin, INITIAL_STATE);

  const message =
    state.status === "error"
      ? state.reason === "denied"
        ? labels.notAuthorized
        : state.reason === "unexpected"
          ? labels.unexpectedError
          : labels.invalidCredentials
      : null;

  const invalid = state.status === "error" && state.reason === "credentials";

  return (
    <form action={formAction} aria-busy={pending} className="flex flex-col gap-6">
      {/*
        Always rendered, so assistive technology observes a change inside a region it
        is already tracking. Mounting the region together with the message is the
        common reason an alert is never announced.
      */}
      <div id={ERROR_REGION_ID} role="alert" aria-live="polite">
        {message ? (
          <p className="rounded-control border border-error/45 bg-error/5 px-4 py-3 text-sm text-foreground">
            {message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="admin-email" className="text-sm font-semibold">
          {labels.email}
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          // Latin characters in a fixed order: the value must not mirror on the
          // Arabic page even though the label does.
          dir="ltr"
          autoFocus
          disabled={pending}
          aria-invalid={invalid || undefined}
          aria-describedby={message ? ERROR_REGION_ID : undefined}
          className={controlStyles()}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="admin-password" className="text-sm font-semibold">
          {labels.password}
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
          disabled={pending}
          aria-invalid={invalid || undefined}
          aria-describedby={message ? ERROR_REGION_ID : undefined}
          className={controlStyles()}
        />
      </div>

      <button type="submit" disabled={pending} className={buttonStyles({ size: "lg" })}>
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
