"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils/cn";

import styles from "./splash-screen.module.css";

/**
 * Decorative splash screen that plays on every full public document load.
 *
 * A fixed cream overlay plays a short CSS 3D entrance - a gold ring settles like a
 * coin, the olive logo tips up beneath it, then the whole group sways gently - and
 * fades out on its own. The page underneath keeps rendering and hydrating the whole
 * time; the splash only covers it and is never unmounted as content.
 *
 * The `[locale]` layout stays mounted across client-side navigation, so it does not
 * replay while the visitor clicks around. A refresh, direct URL entry, or other full
 * document load mounts a new layout and plays it again. Visitors who prefer reduced
 * motion skip it entirely and go straight to content; there is no animation to play
 * back for them.
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
 * regardless of night mode. The existing inverse wordmark is used because the
 * source logo asset is olive-only and must not be recoloured.
 *
 * No `useTranslations` - the splash is the logo mark plus a gold ring, identical in
 * both locales, so it needs no message catalogue.
 */

type Phase = "idle" | "playing" | "exiting" | "done";

/** How long the full scene is held before the exit fade starts. */
const HOLD_MS = 1900;

/**
 * Exit fade duration. Kept beside the matching `splash-out` animation in
 * `splash-screen.module.css` so the two cannot drift apart.
 */
const EXIT_MS = 550;

/**
 * The splash uses the existing inverse wordmark treatment. The source logo image is
 * olive-only, and the project intentionally does not recolour source artwork.
 */

interface SplashScreenProps {
  readonly children: ReactNode;
}

export function SplashScreen({ children }: SplashScreenProps) {
  const [phase, setPhase] = useState<Phase>("idle");

  const beginExit = useCallback(() => {
    setPhase((current) => (current === "playing" ? "exiting" : current));
  }, []);

  // Start after hydration so SSR and hydration both begin in `idle`. Each full public
  // document load mounts a new component and therefore plays the splash once.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
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
              <Logo label="La Dolce Vita" tone="inverse" size="lg" decorative />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
