import localFont from "next/font/local";

/**
 * Typography for a bilingual Arabic/English editorial identity.
 *
 * ---------------------------------------------------------------------------
 * Why `next/font/local` rather than `next/font/google`
 * ---------------------------------------------------------------------------
 * `next/font/google` fetches font CSS from `fonts.googleapis.com` at build time.
 * That host is unreachable from this environment, so the build failed outright -
 * and any CI with restricted egress would fail the same way.
 *
 * Self-hosting is the better production choice regardless: the files are served
 * same-origin (no extra DNS lookup and TLS handshake to `fonts.gstatic.com`), no
 * third-party request is made on a visitor's behalf, builds are hermetic, and
 * the exact files are pinned in version control. `next/font/local` keeps every
 * `next/font` benefit: generated `@font-face` rules, CSS variables, hashed
 * immutable URLs, `font-display: swap`, and a `size-adjust`-corrected fallback
 * so the swap does not shift layout.
 *
 * The `.woff2` files in `src/assets/fonts/` were copied verbatim from the
 * Fontsource packages pinned in `devDependencies` (all 5.3.0), which repackage
 * the official Google Fonts releases as per-subset `.woff2`. Those packages are
 * kept as dev-only dependencies purely to record provenance and to make a future
 * refresh a copy step rather than a hunt.
 *
 * ---------------------------------------------------------------------------
 * Why each script is a separate family
 * ---------------------------------------------------------------------------
 * Two `@font-face` rules that share a family, weight, and style but declare no
 * `unicode-range` do not cooperate - per the CSS cascade the last one wins and
 * the other file is never used. Putting the Latin and Arabic subsets of one
 * family into a single `localFont()` call therefore silently breaks one script.
 *
 * Each subset is its own loader with an explicit `unicode-range`, and the theme
 * stacks in `globals.css` list both families so the browser resolves per glyph.
 * That also means a visitor downloads only the files whose glyphs appear.
 *
 * The ranges are Google Fonts' canonical `latin` and `arabic` subsets, written
 * inline because `next/font` parses its arguments statically and rejects anything
 * that is not a literal ("Font loader values must be explicitly written
 * literals") - a shared constant will not compile.
 *
 * `preload` is off everywhere. Preload hints are emitted statically, so they
 * cannot be made locale-aware: preloading both scripts would pull ~88KB of
 * Arabic on every English page and ~40KB of Latin on every Arabic one. The fonts
 * are still discovered from the render-blocking stylesheet in `<head>`, and the
 * `size-adjust` fallback keeps the swap layout-neutral. Revisit with field LCP
 * data if this proves too conservative.
 *
 * ---------------------------------------------------------------------------
 * Font selection
 * ---------------------------------------------------------------------------
 * Body - IBM Plex Sans Arabic. One design covering both scripts with harmonised
 * metrics, so paragraph rhythm is identical in `/ar` and `/en` rather than
 * drifting between two unrelated families. Its Arabic is a modern Naskh with
 * open counters that stays legible at 14-16px, which the more calligraphic
 * Arabic faces do not. Two weights only - 400 for text, 600 for labels and
 * buttons. 500 is deliberately absent, so components ask for `font-semibold`
 * rather than a weight that would have to be faked.
 *
 * Display (Latin) - Cormorant Garamond. An old-style Garamond revival:
 * Continental European, timeless, unmistakably editorial rather than SaaS.
 * Shipped as one variable file covering 300-700.
 *
 * Display (Arabic) - Amiri. A Naskh revival of the Bulaq Press types, whose
 * modulated stroke contrast is the closest Arabic analogue to Cormorant's
 * old-style contrast, so headings read as one voice across scripts. Only the
 * regular weight is shipped; headings never request a bold Arabic face, and
 * `font-synthesis-weight: none` in `globals.css` prevents a faked one.
 */

export const fontBodyLatin = localFont({
  src: [
    { path: "../assets/fonts/plex-arabic-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/plex-arabic-latin-600.woff2", weight: "600", style: "normal" },
  ],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
  variable: "--font-body-latin",
  display: "swap",
  preload: false,
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Arial"],
  adjustFontFallback: "Arial",
});

export const fontBodyArabic = localFont({
  src: [
    { path: "../assets/fonts/plex-arabic-arabic-400.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/plex-arabic-arabic-600.woff2", weight: "600", style: "normal" },
  ],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC",
    },
  ],
  variable: "--font-body-arabic",
  display: "swap",
  preload: false,
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Arial"],
  adjustFontFallback: "Arial",
});

export const fontDisplayLatin = localFont({
  src: [
    {
      path: "../assets/fonts/cormorant-garamond-latin-variable.woff2",
      weight: "300 700",
      style: "normal",
    },
  ],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
  variable: "--font-display-latin",
  display: "swap",
  preload: false,
  fallback: ["ui-serif", "Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

export const fontDisplayArabic = localFont({
  src: [{ path: "../assets/fonts/amiri-arabic-400.woff2", weight: "400", style: "normal" }],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC",
    },
  ],
  variable: "--font-display-arabic",
  display: "swap",
  preload: false,
  fallback: ["ui-serif", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

/** Class list that exposes every font variable. Applied once, on `<html>`. */
export const fontVariables = [
  fontBodyLatin.variable,
  fontBodyArabic.variable,
  fontDisplayLatin.variable,
  fontDisplayArabic.variable,
].join(" ");
