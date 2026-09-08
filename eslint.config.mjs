import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/**
 * Flat config. `next lint` was removed in Next.js 16 and `next build` no longer
 * lints, so ESLint runs as its own quality gate via `npm run lint`.
 *
 * `eslint-config-next/core-web-vitals` already re-exports the base config, so
 * it is spread instead of importing `eslint-config-next` as well.
 *
 * Pinned to ESLint 9: `eslint-plugin-react`, `eslint-plugin-import`, and
 * `eslint-plugin-jsx-a11y` (all bundled by eslint-config-next) still cap their
 * peer range at ESLint 9, and ESLint 10 crashes on removed context APIs.
 */
export default defineConfig([
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),

  ...nextCoreWebVitals,
  ...nextTypeScript,

  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Pairs with `verbatimModuleSyntax` in tsconfig: type-only imports must
      // be explicit so they are erased rather than emitted.
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
]);
