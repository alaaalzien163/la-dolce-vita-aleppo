import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Allow-lists Supabase Storage as a remote image source.
 *
 * The hostname is derived from `NEXT_PUBLIC_SUPABASE_URL` rather than hardcoded,
 * so it cannot drift from the project actually being queried and no placeholder
 * hostname is ever committed. If the variable is absent the list stays empty:
 * `next/image` then rejects remote sources outright, which is the correct failure
 * mode - better than silently permitting an unintended origin.
 *
 * `images.domains` is deprecated in Next.js 16; `remotePatterns` is used instead
 * because it constrains protocol and pathname, not just the host. The path is
 * scoped to the public object endpoint, so a signed or private path cannot be
 * proxied through the optimizer by accident.
 */
function supabaseImagePatterns(): NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!raw) {
    return [];
  }

  try {
    const { protocol, hostname } = new URL(raw);

    if (protocol !== "https:" && protocol !== "http:") {
      return [];
    }

    return [
      {
        protocol: protocol === "https:" ? "https" : "http",
        hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  // Explicit rather than implicit: Strict Mode is the App Router default, but
  // stating it prevents an accidental opt-out during a future config edit.
  reactStrictMode: true,

  // Do not advertise the framework in response headers.
  poweredByHeader: false,

  // Never ship a build that does not typecheck.
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    remotePatterns: supabaseImagePatterns(),
  },

  experimental: {
    // Enables `app/global-not-found.tsx`. Required so that requests which never
    // reach a locale segment still render a valid document with `lang`/`dir`
    // instead of Next.js' bare internal error page.
    globalNotFound: true,
  },
};

// Path is passed explicitly rather than relying on auto-detection.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
