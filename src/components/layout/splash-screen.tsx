"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import styles from "./splash-screen.module.css";

/**
 * Decorative splash screen that plays once when a visitor enters the site.
 *
 * A fixed cream overlay plays a short CSS 3D entrance - a gold ring settles like a
 * coin, the olive logo tips up beneath it, then the whole group sways gently - and
 * fades out on its own. The page underneath keeps rendering and hydrating the whole
 * time; the splash only covers it and is never unmounted as content.
 *
 * A session-storage marker prevents it from replaying on refreshes, locale changes,
 * or later full document loads in the same browser tab. A new tab or browser session
 * is a new site entry and may show it once. The `[locale]` layout also stays mounted
 * across client-side navigation, so it never reappears while the visitor clicks
 * around. Visitors who prefer reduced motion skip it entirely and go straight to
 * content; there is no animation to play back for them.
 *
 * SSR renders no overlay, and the effect starts one a tick after hydration.
 * Starting in the `idle` phase keeps server HTML and the first hydrated render
 * identical, so there is no hydration mismatch and no flash of the splash for
 * anyone.
 *
 * While it plays, the content wrapper carries the `inert` attribute so keyboard
 * focus and assistive technology cannot reach the page underneath; the overlay
 * itself is decorative and exposes nothing to the accessibility tree. Its backdrop
 * is always the brand cream, never the theme surface: the mark is a single-colour
 * olive image that is invisible on dark, so the emblem dictates a light moment
 * regardless of night mode.
 *
 * No `useTranslations` - the splash is the logo mark plus a gold ring, identical in
 * both locales, so it needs no message catalogue.
 */

type Phase = "idle" | "playing" | "exiting" | "done";

const SPLASH_SESSION_KEY = "ldv-splash-seen";

/** How long the full scene is held before the exit fade starts. */
const HOLD_MS = 1900;

/**
 * Exit fade duration. Kept beside the matching `splash-out` animation in
 * `splash-screen.module.css` so the two cannot drift apart.
 */
const EXIT_MS = 550;

/**
 * Largest rendered width of the splash logo mark, in CSS pixels. The logo's own
 * `Logo` component tops out at header/footer scale (`RENDERED_HEIGHT.lg` = 48px);
 * the splash needs a display size beyond that, so the mark is rendered here directly
 * from the same source asset. Intrinsic dimensions are taken from `logo.tsx`'s
 * `INTRINSIC` (2365 x 794) so the layout box and ratio stay authoritative.
 */
const SPLASH_MAX_WIDTH = 416;
const SPLASH_HEIGHT = Math.round((SPLASH_MAX_WIDTH * 794) / 2365);

interface SplashScreenProps {
  readonly children: ReactNode;
}

export function SplashScreen({ children }: SplashScreenProps) {
  const [phase, setPhase] = useState<Phase>("idle");

  const beginExit = useCallback(() => {
    setPhase((current) => (current === "playing" ? "exiting" : current));
  }, []);

  // Decide once whether this browser-tab session has already entered the site. The
  // decision is deferred a tick before `setPhase`, so SSR and hydration both begin
  // in `idle`. If storage is unavailable, showing the splash is the safe fallback.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    try {
      if (window.sessionStorage.getItem(SPLASH_SESSION_KEY) === "true") {
        return;
      }
      window.sessionStorage.setItem(SPLASH_SESSION_KEY, "true");
    } catch {
      // Storage may be blocked; the splash still works for this document load.
    }

    const id = window.setTimeout(() => setPhase("playing"), 0);
    return () => window.clearTimeout(id);
  }, []);

  // Auto-dismiss: hold, then begin the fade.
  useEffect(() => {
    if (phase !== "playing") {
      return;
    }
    const id = window.setTimeout(beginExit, HOLD_MS);
    return () => window.clearTimeout(id);
  }, [phase, beginExit]);

  // Finish the fade by unmounting the overlay once `splash-out` has run its course.
  useEffect(() => {
    if (phase !== "exiting") {
      return;
    }
    const id = window.setTimeout(() => setPhase("done"), EXIT_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  // Keyboard parity for the click-to-skip affordance.
  useEffect(() => {
    if (phase !== "playing") {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        beginExit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, beginExit]);

  return (
    <>
      {/*
        The wrapper div stays mounted for the page's lifetime so the `inert`
        attribute can cover the whole page while the overlay is up. It is released as
        soon as the fade starts, so content is focusable again the moment it becomes
        visible. A wrapper that mounted/unmounted with the phases would reparent the
        server-rendered children mid-page and risk a flash during the exit fade.
      */}
      <div inert={phase === "playing"}>{children}</div>

      {phase === "playing" || phase === "exiting" ? (
        <div
          aria-hidden="true"
          onClick={beginExit}
          className={cn(
            "fixed inset-0 z-[200] flex items-center justify-center overflow-hidden select-none",
            styles.overlay,
            phase === "exiting" && styles.exit,
          )}
        >
          <div className={cn("flex flex-col items-center", styles.scene)}>
            <div
              className={cn(
                "mb-12 aspect-square h-[clamp(2.75rem,9vw,4.5rem)] rounded-full",
                "border-[1.5px] border-(--color-accent-line)",
                styles.ring,
              )}
            />
            <div className={styles.emblem}>
              <Image
                src="/logo.png"
                width={SPLASH_MAX_WIDTH}
                height={SPLASH_HEIGHT}
                alt=""
                priority
                sizes="(min-width: 26rem) 416px, 72vw"
                className="h-auto w-[min(72vw,26rem)] object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
