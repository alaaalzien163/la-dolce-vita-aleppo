"use client";

import { useEffect, useState } from "react";

import { iconButtonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Night/light mode toggle.
 *
 * The resolution itself happens in the inline script at the top of the public
 * layout (`THEME_INIT_SCRIPT`), which stamps an explicit `data-theme="light"` or
 * `data-theme="dark"` on `<html>` before first paint. That attribute is the single
 * source of truth for the CSS overrides in `globals.css`, so this component only:
 *
 *   1. reads the resolved theme back off the element on mount (its initial render
 *      must match the server's light markup, so the real value arrives via an
 *      effect - any swap happens behind the splash overlay anyway), and
 *   2. flips the attribute and persists the explicit choice to `localStorage`,
 *      which the init script honours on the next load.
 *
 * The button is named by a prop, never by `useTranslations` - same rule as the
 * mobile navigation, keeping the message catalogue out of the client bundle.
 *
 * The icon shows the *target* theme: a moon offers dark mode on a light page, a
 * sun offers light mode on a dark page.
 */

type Theme = "light" | "dark";

const THEME_KEY = "ldv-theme";

interface ThemeToggleProps {
  readonly toDarkLabel: string;
  readonly toLightLabel: string;
}

export function ThemeToggle({ toDarkLabel, toLightLabel }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // The inline theme script has already stamped `data-theme` before hydration,
    // but reading it here needs one deferred tick so the effect never calls
    // setState synchronously (and the first render stays identical to SSR).
    const id = window.setTimeout(() => {
      setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage can be blocked; the choice simply lives for this page load.
    }
    setTheme(next);
  }

  const isDark = theme === "dark";
  const label = isDark ? toLightLabel : toDarkLabel;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className={cn(iconButtonStyles(), "group")}
    >
      {/* Decorative: the button is named by aria-label. The icon turns a few degrees
          on hover as the only movement - disabled under `prefers-reduced-motion`. */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-6 transition-transform duration-200 ease-out motion-safe:group-hover:rotate-6"
      >
        {isDark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </>
        ) : (
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        )}
      </svg>
    </button>
  );
}
