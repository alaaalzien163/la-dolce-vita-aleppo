/**
 * Slug normalisation and validation, in one place.
 *
 * The database already constrains this column, and the shape it enforces is
 * `^[a-z0-9]+(-[a-z0-9]+)*$`: lowercase alphanumerics in hyphen-separated groups, no
 * leading, trailing, or doubled hyphens. Every producer and validator of a slug in this
 * codebase goes through this module, so the client hint, the server validation, and the
 * database constraint cannot drift into disagreeing about what is acceptable - which is
 * how a form starts rejecting values the database would accept, or worse, accepting ones
 * it will not.
 */

/** The exact shape the database enforces. Anchored, so partial matches cannot pass. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Longest slug accepted. Well inside any Postgres text limit; keeps URLs sane. */
export const SLUG_MAX_LENGTH = 96;

/**
 * Rewrites arbitrary input into the constrained shape, or returns `""` when nothing
 * usable survives.
 *
 * ARABIC INPUT PRODUCES AN EMPTY SLUG, and that is deliberate rather than an oversight.
 * Section names are Arabic, and the constraint permits only `a-z0-9`. Transliterating
 * Arabic to Latin would mean choosing a romanisation scheme - and there are several,
 * none authoritative - so this refuses to invent one. The admin types the slug, which is
 * a URL identifier and a deliberate editorial choice, not a derived value.
 *
 * `NFKD` normalisation first, so accented Latin characters degrade to their base letter
 * (`café` -> `cafe`) instead of being dropped entirely.
 */
export function normalizeSlug(input: string): string {
  return (
    input
      .normalize("NFKD")
      // Strip combining marks left behind by decomposition.
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      // Any run of unsupported characters becomes a single separator.
      .replace(/[^a-z0-9]+/g, "-")
      // Collapse and trim separators, so no doubled or edge hyphens remain.
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, SLUG_MAX_LENGTH)
      // Truncation can re-expose a trailing hyphen.
      .replace(/-+$/g, "")
  );
}

/** Whether a value already satisfies the database constraint. */
export function isValidSlug(value: string): boolean {
  return value.length > 0 && value.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(value);
}
