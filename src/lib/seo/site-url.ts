/**
 * Resolves the site's absolute origin for `metadataBase`, canonical URLs, and
 * `hreflang` alternates.
 *
 * The chain is ordered most- to least-explicit. No production domain is
 * hardcoded: every candidate comes from the environment, and the final fallback
 * is localhost so that local development and preview builds still produce
 * resolvable absolute URLs instead of emitting a Next.js `metadataBase` warning.
 *
 * 1. `NEXT_PUBLIC_SITE_URL`             - explicit, set once the domain exists
 * 2. `VERCEL_PROJECT_PRODUCTION_URL`    - injected by Vercel, stable per project
 * 3. `VERCEL_URL`                       - injected by Vercel, per deployment
 * 4. `http://localhost:<PORT|3000>`     - development fallback
 */
const DEFAULT_DEV_PORT = "3000";

function normalize(value: string): string {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function getSiteUrl(): URL {
  const candidates: ReadonlyArray<string | undefined> = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate || candidate.trim() === "") {
      continue;
    }

    try {
      return new URL(normalize(candidate));
    } catch {
      continue;
    }
  }

  return new URL(`http://localhost:${process.env.PORT ?? DEFAULT_DEV_PORT}`);
}
