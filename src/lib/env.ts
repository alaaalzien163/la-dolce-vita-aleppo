/**
 * Typed, validated access to environment variables.
 *
 * Every variable read here is `NEXT_PUBLIC_*`, so this module is safe to import
 * from either a Server or a Client Component. It carries no `server-only` guard
 * because there is nothing secret in it - by design. The public site reads data
 * through Row Level Security using the publishable key; no service-role or secret
 * key exists in this project, so there is no server/client split to enforce yet.
 *
 * If a privileged key is ever introduced it must live in a separate module that
 * starts with `import "server-only"`, never in this one.
 *
 * Validation is deliberately lazy - performed on first use rather than at module
 * load. A module-level throw would fail `next build` for routes that never touch
 * Supabase. Reading a variable that is missing or malformed throws immediately at
 * the point of use, with a message naming the variable.
 */

type PublicEnvKey =
  "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" | "NEXT_PUBLIC_SITE_URL";

class EnvError extends Error {
  constructor(key: PublicEnvKey, reason: string) {
    super(
      `Environment variable ${key} ${reason}. ` +
        `Copy .env.example to .env.local and set it. ` +
        `Values are available in the Supabase dashboard under Settings > API Keys.`,
    );
    this.name = "EnvError";
  }
}

/**
 * `NEXT_PUBLIC_*` variables are string-substituted at build time, so they must be
 * read as literal static property accesses. A dynamic `process.env[key]` lookup
 * is not replaced by the compiler and resolves to `undefined` in the browser.
 */
function readRaw(key: PublicEnvKey): string | undefined {
  switch (key) {
    case "NEXT_PUBLIC_SUPABASE_URL":
      return process.env.NEXT_PUBLIC_SUPABASE_URL;
    case "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY":
      return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    case "NEXT_PUBLIC_SITE_URL":
      return process.env.NEXT_PUBLIC_SITE_URL;
  }
}

function requireString(key: PublicEnvKey): string {
  const value = readRaw(key)?.trim();

  if (!value) {
    throw new EnvError(key, "is missing or empty");
  }

  return value;
}

function requireHttpUrl(key: PublicEnvKey): string {
  const value = requireString(key);

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new EnvError(key, `is not a valid absolute URL (received "${value}")`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new EnvError(key, `must use http or https (received "${parsed.protocol}")`);
  }

  return parsed.origin;
}

/** Supabase project origin, e.g. `https://<ref>.supabase.co`. Throws if unusable. */
export function getSupabaseUrl(): string {
  return requireHttpUrl("NEXT_PUBLIC_SUPABASE_URL");
}

/**
 * Supabase publishable key. Public by design - it resolves to the `anon` Postgres
 * role, so Row Level Security governs what it can read.
 *
 * Guards against the single most damaging misconfiguration: pasting a secret key
 * into a `NEXT_PUBLIC_*` variable, which would ship it to every browser.
 */
export function getSupabasePublishableKey(): string {
  const value = requireString("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (value.startsWith("sb_secret_") || value.startsWith("sbp_")) {
    throw new EnvError(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "contains a secret key. NEXT_PUBLIC_* values are inlined into the browser " +
        "bundle. Use the publishable key (sb_publishable_...) instead and rotate " +
        "the secret you just exposed",
    );
  }

  return value;
}

/** Whether Supabase is configured at all, without throwing. */
export function hasSupabaseConfig(): boolean {
  return Boolean(
    readRaw("NEXT_PUBLIC_SUPABASE_URL")?.trim() &&
    readRaw("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")?.trim(),
  );
}
