"use server";

import { redirect } from "next/navigation";

import {
  PROFILE_ACTION_ERROR,
  PASSWORD_ACTION_ERROR,
  type ProfileFormState,
  type PasswordFormState,
} from "@/app/admin/profile/error-keys";
import { LOGIN_NOTICE, requireAdmin } from "@/lib/auth/admin";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import { parseAdminProfileForm, parsePasswordChangeForm } from "@/lib/validation/profile";

/**
 * Mutations for the admin's own profile and password.
 *
 * EVERY ACTION START... FROM `requireAdmin()`. A Server Action is a public HTTP
 * endpoint - reachable by anyone who knows its id whether or not they ever loaded
 * the page that renders it - so the guard on the page protects the page, not these.
 * Authorization and the caller's `auth.uid()` are re-established per call from the
 * session cookie, and BOTH come from `requireAdmin()`'s return value. No profile
 * id, role, or email is ever accepted from the form.
 *
 * PROFILE WRITES TOUCH ONE COLUMN ONLY: `full_name`. The payload
 * below cannot express `role`, `id`, or the timestamps, so a submission cannot
 * elevate staff to admin or rewrite identity columns. RLS still governs the update,
 * via the authenticated client: a policy scoped to `auth.uid()` is the contract,
 * and it is never bypassed here.
 *
 * PASSWORD CHANGES USE SUPABASE AUTH, NOT SQL. `public.profiles` has no password
 * column and `auth.users` is never touched directly. The current password is
 * verified the one supported way - an actual `signInWithPassword` with the token
 * claims' email - and the new password is applied with `auth.updateUser`, which
 * changes the password of the session's user only. Values are never logged, never
 * stored, and never placed in a URL or an error.
 *
 * Postgrest/auth errors are logged server-side with codes and statuses but never
 * the submitted values. Sessions are discarded after a password change so the
 * admin is never left holding credentials that no longer match the account.
 */

/**
 * Applies the admin's submitted profile values to their own row. The row is the
 * one `auth.uid()` names; `id` never comes from the page.
 */
export async function updateAdminProfile(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const identity = await requireAdmin();

  const parsed = parseAdminProfileForm(formData);

  if (!parsed.ok) {
    return { status: "invalid", fields: parsed.fieldErrors };
  }

  const supabase = await getSupabaseAuthClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.values.fullName,
    })
    .eq("id", identity.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(`[supabase] admin.profile.update failed for ${identity.id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { status: "error", error: PROFILE_ACTION_ERROR.profileUpdateFailed };
  }

  if (data === null) {
    // `requireAdmin()` proved the row exists moments ago; zero affected rows here
    // means it vanished mid-save, so this is not presented as a success.
    return { status: "error", error: PROFILE_ACTION_ERROR.profileNotFound };
  }

  redirect("/admin/profile");
}

/**
 * Changes the current admin's password.
 *
 * SECURITY MODEL (documented, per the requirement):
 *   - `requireAdmin()` resolves the caller and proves `profiles.role = admin`.
 *   - Supabase Auth has no "verify current password" endpoint. The safest
 *     supported equivalent is a password-grant sign-in with the token claims'
 *     email and the submitted current password: if it authenticates, the current
 *     password is real, and the returned session belongs to that user.
 *   - The new password is then applied with `auth.updateUser`, which operates on
 *     the authenticated user only - never on a client-supplied id.
 *   - GoTrue invalidates credentials on password change. The session is discarded
 *     explicitly and the admin is sent back to sign in with the new password,
 *     rather than being left in a state the browser still believes is valid.
 */
export async function changeAdminPassword(
  _previous: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const identity = await requireAdmin();

  const parsed = parsePasswordChangeForm(formData);

  if (!parsed.ok) {
    return { status: "invalid", fields: parsed.fieldErrors };
  }

  if (!identity.email) {
    // Current-password verification needs an email identity to authenticate
    // against. Without one the update is refused rather than weakened.
    return { status: "error", error: PASSWORD_ACTION_ERROR.emailNotAvailable };
  }

  const supabase = await getSupabaseAuthClient();

  // Verify the current password by doing what verifying means: authenticating.
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: identity.email,
    password: parsed.values.currentPassword,
  });

  if (signInError || signInData.user?.id !== identity.id) {
    // Logged with neither password value. The visitor learns only "not accepted".
    console.warn(`[auth] current-password verification failed for admin ${identity.id}`);
    return { status: "error", error: PASSWORD_ACTION_ERROR.invalidCurrentPassword };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.values.newPassword,
  });

  if (updateError) {
    console.error(
      `[auth] password update failed for admin ${identity.id}: ${updateError.message}`,
      {
        code: updateError.code,
        status: updateError.status,
      },
    );
    return { status: "error", error: PASSWORD_ACTION_ERROR.passwordUpdateFailed };
  }

  // The change invalidated the access/refresh tokens. Sign out explicitly (local
  // scope only, like the sign-out button) so no stale session lingers, then point
  // the admin at the new credentials.
  await supabase.auth.signOut({ scope: "local" });

  redirect(`/admin/login?notice=${LOGIN_NOTICE.passwordChanged}`);
}
