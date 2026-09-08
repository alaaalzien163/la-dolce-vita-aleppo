"use server";

import { redirect } from "next/navigation";

import {
  SITE_SETTINGS_ACTION_ERROR,
  type SiteSettingsFormState,
} from "@/app/admin/settings/error-keys";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidateAllPublic } from "@/lib/cache/public-revalidation";
import { getSupabaseAuthClient } from "@/lib/supabase/server";
import { parseSiteSettingsForm, type SiteSettingsInput } from "@/lib/validation/site-settings";

type SiteSettingsClient = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

/**
 * Mutations for `public.site_settings`, the settings singleton.
 *
 * THE ACTION STARTS WITH `requireAdmin()`. A Server Action is a public HTTP
 * endpoint - reachable by anyone who knows its id whether or not they ever
 * loaded the page that renders it - so the guard on the page protects the page,
 * not this. Authorization is re-established per call, from the session cookie,
 * against `profiles.role`.
 *
 * Only one action exists, for both the first save and every save after it. The
 * action re-reads the singleton itself and never trusts a client-supplied id:
 * there is no hidden id field, so a caller cannot target a row they were never
 * shown and a stale form keeps operating on the row that is actually there.
 *
 * THE SINGLETON. The table is designed to hold exactly one row. The action reads
 * it with `.maybeSingle()`, which Postgres turns into a hard error (PGRST116)
 * the moment two rows exist - a state the admin must fix in the database, since
 * silently overwriting one of two "truths" would make the corruption look
 * legitimate. Zero rows is the first-save state and creates the row. On a
 * unique-violation race the action adopts the winner instead of writing a
 * duplicate, and every `opening_hours` write is deliberately omitted - the
 * column is preserved untouched because its JSON shape has never been defined.
 *
 * Postgrest errors are logged with their code, details, and hint and never
 * returned. The admin sees an application-level key; the diagnostics stay in
 * the server log where they are useful and where they cannot leak schema detail
 * to a browser.
 */

/**
 * Postgres raises PGRST116 when a `.maybeSingle()` request matches more than one
 * row. That is the signature of the singleton invariant having been broken.
 */
const MULTIPLE_ROWS_CODE = "PGRST116";

/** A unique violation. Fired on insert when another writer created the singleton first. */
const UNIQUE_VIOLATION = "23505";

/** The `singleton_key` the first insert carries. The database defaults it, but naming it is clearer. */
const SITE_SETTINGS_SINGLETON_KEY = 1;

/** Column names the database stores. `opening_hours` is intentionally absent. */
function buildPayload(values: SiteSettingsInput) {
  return {
    site_name: values.siteName,
    tagline: values.tagline,
    phone: values.phone,
    email: values.email,
    address: values.address,
    google_maps_url: values.googleMapsUrl,
    instagram_url: values.instagramUrl,
  };
}

/**
 * Rebuilds the public pages. Every public page shares the site chrome, and the
 * footer renders the Instagram link from this singleton, so a settings edit can
 * touch any public page - all four routes in both locales are invalidated, and no
 * more than that. A blanket `revalidatePath("/", "layout")` would discard cached
 * routes nothing here feeds.
 */
function revalidatePublicPages(): void {
  revalidateAllPublic();
}

/**
 * The singleton's current id, or `null` when it has never been created.
 * `.maybeSingle()` surfaces duplicates as PGRST116 rather than choosing one,
 * because overwriting half of a broken singleton is worse than refusing to.
 */
async function readCurrentSingletonId(
  supabase: SiteSettingsClient,
): Promise<
  | { readonly status: "ok"; readonly id: string | null }
  | { readonly status: "malformed" }
  | { readonly status: "failed" }
> {
  const { data, error } = await supabase.from("site_settings").select("id").maybeSingle();

  if (error) {
    if (error.code === MULTIPLE_ROWS_CODE) {
      return { status: "malformed" };
    }

    console.error(`[supabase] admin.siteSettings.read failed: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { status: "failed" };
  }

  return { status: "ok", id: data?.id ?? null };
}

/** Creates the row. `existed` means another writer won the race and no row was written. */
async function createSingleton(
  supabase: SiteSettingsClient,
  values: SiteSettingsInput,
): Promise<
  | { readonly status: "inserted"; readonly id: string }
  | { readonly status: "existed" }
  | { readonly status: "failed" }
> {
  const { data, error } = await supabase
    .from("site_settings")
    .insert({ ...buildPayload(values), singleton_key: SITE_SETTINGS_SINGLETON_KEY })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { status: "existed" };
    }

    console.error(`[supabase] admin.siteSettings.create failed: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { status: "failed" };
  }

  if (data === null) {
    console.error("[supabase] admin.siteSettings.create returned no row", {});
    return { status: "failed" };
  }

  return { status: "inserted", id: data.id };
}

/**
 * Updates the row targeted by the id the action itself resolved. `missing`
 * means the row disappeared between resolve and update (deleted by a second
 * admin) - the action calls this with a resolved id, so zero affected rows is
 * never a silent success.
 */
async function updateById(
  supabase: SiteSettingsClient,
  id: string,
  values: SiteSettingsInput,
): Promise<
  { readonly status: "updated" } | { readonly status: "missing" } | { readonly status: "failed" }
> {
  const { data, error } = await supabase
    .from("site_settings")
    .update(buildPayload(values))
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(`[supabase] admin.siteSettings.update failed for ${id}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { status: "failed" };
  }

  return data === null ? { status: "missing" } : { status: "updated" };
}

/**
 * Resolves the row to write to: the existing singleton, a fresh first save, or
 * the winner after losing a create race.
 */
async function resolveSingletonId(
  supabase: SiteSettingsClient,
  values: SiteSettingsInput,
): Promise<
  | { readonly status: "ok"; readonly id: string }
  | { readonly status: "malformed" }
  | { readonly status: "failed" }
> {
  const current = await readCurrentSingletonId(supabase);

  if (current.status !== "ok") {
    return { status: current.status };
  }

  if (current.id !== null) {
    return { status: "ok", id: current.id };
  }

  const created = await createSingleton(supabase, values);

  if (created.status === "inserted") {
    return { status: "ok", id: created.id };
  }

  if (created.status === "failed") {
    return { status: "failed" };
  }

  // A create race we lost: another writer created the singleton after our read
  // saw zero rows. Adopt the winner so the duplicate never gets written twice.
  const winner = await readCurrentSingletonId(supabase);

  if (winner.status !== "ok" || winner.id === null) {
    return { status: "failed" };
  }

  return { status: "ok", id: winner.id };
}

export async function saveSiteSettings(
  _previous: SiteSettingsFormState,
  formData: FormData,
): Promise<SiteSettingsFormState> {
  await requireAdmin();

  const parsed = parseSiteSettingsForm(formData);

  if (!parsed.ok) {
    return { status: "invalid", fields: parsed.fieldErrors };
  }

  const supabase = await getSupabaseAuthClient();

  const target = await resolveSingletonId(supabase, parsed.values);

  if (target.status === "malformed") {
    return { status: "error", error: SITE_SETTINGS_ACTION_ERROR.singletonMalformed };
  }

  if (target.status === "failed") {
    return { status: "error", error: SITE_SETTINGS_ACTION_ERROR.saveFailed };
  }

  const outcome = await updateById(supabase, target.id, parsed.values);

  if (outcome.status === "failed") {
    return { status: "error", error: SITE_SETTINGS_ACTION_ERROR.saveFailed };
  }

  if (outcome.status === "missing") {
    // The row was deleted between resolve and update, likely by a second admin.
    // Recreate it: the submitted values are the only copy of the edit left, and
    // the singleton must exist.
    const recreated = await createSingleton(supabase, parsed.values);

    if (recreated.status === "inserted") {
      revalidatePublicPages();
      redirect("/admin/settings");
    }

    if (recreated.status === "failed") {
      return { status: "error", error: SITE_SETTINGS_ACTION_ERROR.saveFailed };
    }

    // Another writer created a new singleton between our resolve and our insert.
    // Fold the submitted values into the winner.
    const winner = await readCurrentSingletonId(supabase);

    if (winner.status !== "ok" || winner.id === null) {
      return { status: "error", error: SITE_SETTINGS_ACTION_ERROR.saveFailed };
    }

    const folded = await updateById(supabase, winner.id, parsed.values);

    if (folded.status !== "updated") {
      return { status: "error", error: SITE_SETTINGS_ACTION_ERROR.saveFailed };
    }
  }

  revalidatePublicPages();
  redirect("/admin/settings");
}
