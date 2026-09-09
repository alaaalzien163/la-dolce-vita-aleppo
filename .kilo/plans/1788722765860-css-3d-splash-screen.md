# CSS 3D Splash Screen

Add an animated, language-neutral splash screen to the public site, played once per
browser session on the first page load.

## Decisions (confirmed with user)

- **Tech:** CSS 3D transforms/animations (perspective, `rotateX/Y`, `translateZ`) — no
  Three.js/WebGL, no new dependencies.
- **Frequency:** once per session (tracked with `sessionStorage`), on first load only.
  Never on client-side navigation (the `[locale]` layout stays mounted, so the splash
  component is never re-mounted after dismissal).
- **Look:** cream background (`--color-background`), existing olive `Logo`
  (`src/components/brand/logo.tsx`), thin gold ring accent. Fits brand, needs no light
  logo export.
- **Timing:** auto-dismiss ~2.5s (hold ~1.9s, exit fade ~0.55s). Click/tap anywhere or
  `Escape` dismisses early. `prefers-reduced-motion: reduce` → skip the splash entirely.
- **Scope:** public `[locale]` pages only. Admin (`src/app/admin/**`) untouched.

No new messages/translations needed: the splash is a decorative logo image only, so it is
identical in `en` and `ar`.

## Files

- **New:** `src/components/layout/splash-screen.tsx` — `"use client"` component.
- **New:** `src/components/layout/splash-screen.module.css` — keyframes/scenes. CSS modules
  are preferred over new globals.css rules (page-specific styles stay co-located; the repo
  documents globals.css as tokens + base only).
- **Edit:** `src/app/[locale]/layout.tsx` — wrap the body content in `<SplashScreen>`.
- No changes to `package.json`, `globals.css`, messages, or admin.

## Implementation steps

### 1. Mount in the layout

`src/app/[locale]/layout.tsx` (server component, keeps static generation — see "Why no
cookies" below):

```tsx
<body className="min-h-dvh antialiased">
  <SplashScreen>
    <SkipLink href={`#${SECTION_IDS.home}`}>{t("skipToContent")}</SkipLink>
    {children}
  </SplashScreen>
</body>
```

Server components passed as `children` into a client component is supported — the child
tree stays server-rendered. Admin and `global-not-found` are outside `[locale]`, so they
never see the splash.

### 2. Component (`splash-screen.tsx`)

State machine — three phases, chosen so SSR HTML and the first hydrated render match
(hydration must never see an overlay that SSR did not emit):

- `idle` — render `<div>{children}</div>` only, no overlay. Initial phase on both server
  and client.
- `playing` — render content wrapper with `inert` plus the fixed overlay on top.
- `done` — content only (no overlay, no inert). Returned forever after.

Behavior (`useEffect` on mount):

1. `const key = "ldv-splash-seen";`
2. If `sessionStorage.getItem(key) === "1"` → set `done` immediately.
3. Otherwise write `"1"` (inside `try/catch` — storage can be unavailable/blocked).
4. If `window.matchMedia("(prefers-reduced-motion: reduce)").matches` → set `done`
   immediately (user preference: content now, no splash). Do not run the timeline.
5. Otherwise set `playing`; then after `SHOW_HOLD_MS` (1900) switch the overlay to its
   exiting state; after `EXIT_MS` (550) more, set `done`.

Skip affordances while `playing`:

- `onClick` on the overlay → begin exit immediately.
- `Escape` keydown listener (window; add/remove in effect, mirroring the pattern in
  `mobile-nav.tsx`) → begin exit.

Exit: first drop `inert` (content is focusable again), add the module's `.exit` scene to
the overlay root; on timeout/transitionend set `done` which unmounts the overlay.

Structure during `playing` (order matters — overlay must be the later sibling so it paints
above sticky elements):

```tsx
<>
  <div inert>{children}</div>
  <div className={styles.overlay + " fixed inset-0 z-[200] ..."} onClick={skip}>
    ... stage ...
  </div>
</>
```

A11y:

- The overlay is decorative: mark its contents `aria-hidden="true"` and use
  `alt=""`/`decorative` for the logo (see `Logo`'s `decorative` prop). No `role`, no live
  region, nothing focusable inside it.
- While `playing`, the content wrapper carries the React 19 boolean `inert` prop so
  keyboard focus and AT cannot reach the page underneath. Verify `inert` on a wrapper div
  works in this Next.js version before relying on it (see AGENTS.md note below); the
  fallback is `aria-hidden` + a `visibility` guard.
- Content is never unmounted, so `SkipLink`/`<main id="home">` targets and anchor behavior
  are unaffected.

### 3. Scene + animation spec (`splash-screen.module.css` + Tailwind)

Composition (centered column in the fixed overlay):

1. **Gold ring** (above the logo): `<div className={cn(styles.ring, "size-... rounded-full border")}>`
   — thin ring, `border-color: var(--color-accent-line)` (gold-600), ~1.5px, size
   `clamp(3.5rem, 14vw, 6rem)`.
2. **Logo**: existing `Logo` component (`src/components/brand/logo.tsx`), `decorative`,
   size that renders roughly 240–320px wide (derive from `RENDERED_HEIGHT` as the file
   does; do not guess dimensions).

Scene/animation (stage provides 3D space):

- Overlay root gets `[perspective:1200px]`; a wrapper keeps `[transform-style:preserve-3d]`.
- **Ring entrance** (`ring-in`, ~0.7s, `cubic-bezier(0.22,1,0.36,1)`, slight delay ~0.1s):
  coin-flip settle — `rotateX(85deg) scale(0.5) opacity(0)` → `rotateX(0) scale(1)
opacity(1)`, `backface-visibility: hidden` on the ring to avoid a mirrored flash.
- **Ring hold**: after entrance, a slow breathing animation on a nested wrapper
  (`ring-breathe`, ~4s ease-in-out infinite alternate, scale 1 ↔ ~1.05) so the accent stays
  alive during the hold.
- **Logo entrance** (`emblem-in`, ~0.85s, same easing, ~0.15s delay): `rotateX(78deg)
translateY(16px) scale(0.92) opacity(0)` → settled flat `rotateX(0) translateY(0)
scale(1) opacity(1)`, with `backface-visibility: hidden` while rotating.
- **Logo hold** (nested wrapper, `float-3d`, ~3.4s ease-in-out infinite alternate starting
  after the entrance): gentle `rotateY(-5deg)` ↔ `rotateY(5deg)` plus a few px of
  `translateZ` sway. Keep parent/child 3D chains consistent (`preserve-3d` on each level,
  perspective on the outermost) so the tilt reads as true depth.
- **Exit** (`.exit` on the overlay root, `splash-out`, 0.55s ease-in `forwards`): whole
  overlay fades to `opacity: 0` with a barely perceptible `scale(0.99)`/upward drift on the
  stage. Prefer one scene-wide exit over per-element exits.

Timing constants at the top of the component:
`SHOW_HOLD_MS = 1900`, `EXIT_MS = 550` (total ≈ 2450ms). CSS durations must agree with the
JS schedule; keep the two sets of numbers adjacent in code with a comment.

Duration budgets: everything above stays < 2.5s and adds no network weight (no new deps,
one image already in `public/logo.png` already used elsewhere, CSS module is tiny).
Splash logo uses the non-`priority` `next/image` path so it never competes as LCP.

### 4. Why sessionStorage and no cookies

`sessionStorage` keeps the decision purely client-side. A server-side cookie check would
need `cookies()` in `[locale]/layout.tsx`, which would opt the statically prerendered pages
out of SSG (the layout comments document that everything is prerendered at build time).
Keep that property. The accepted trade-off: a returning user's reload renders content for
one frame before the effect confirms the flag — the overlay must therefore mount _after_
the decision effect (start in `idle`), never be server-emitted.

## Edge cases / failure modes

- `sessionStorage` unavailable → `try/catch`, still play once this session (overlay only
  shows on this load since the component never re-runs).
- Reduced motion → splash skipped entirely; the global reduced-motion CSS
  (`globals.css` `animation-duration: 0.01ms`) would also nuke CSS animations, so rely on
  the JS media query, not CSS, for the decision.
- User switches tabs mid-splash → timers may throttle; exit still resolves on the next
  tick; worst case overlay clears a moment late. Use `timeout` cleanup in the effect.
- Double-mount in dev StrictMode → effect runs twice; the `"1"` write is idempotent and the
  exit timeout is cleaned up, so no double timeline. Guard against stale timer ids.
- Locale switch / client navigation → layout stays mounted, phase is `done`, nothing
  re-triggers.
- Very narrow viewport (320px) → stage uses fluid `clamp()` sizes and `overflow-hidden`;
  logo must never exceed gutter-adjusted width.
- Fonts/images: logo image already loaded elsewhere on the page (header); no new asset.

## Validation

1. `npm run lint`
2. `npm run typecheck`
3. `npx prettier --check src/components/layout/splash-screen.tsx src/components/layout/splash-screen.module.css src/app/[locale]/layout.tsx`
4. Manual (`npm run dev`):
   - Fresh session (incognito or clear `sessionStorage`): splash plays ~2.5s with the ring
     - logo 3D entrance, float hold, then fades; page is `inert`/unfocusable underneath and
       content is interactable immediately after.
   - Reload in the same tab/session: no splash.
   - Click anywhere and press `Escape` during the hold: exits early.
   - DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce": splash never
     appears.
   - Visit `/en` and `/ar`: both fine; visit `/admin`: no splash; hard-navigate to a
     non-home public page (e.g. via proxy) on first visit: splash still plays once.
   - Verify no console errors and no hydration mismatch warnings.
5. `npm run build` to confirm the static prerender of both locales still succeeds (no
   dynamic rendering introduced).

## Notes for the implementer

- Per `AGENTS.md`, this Next.js version differs from prior ones — before writing code,
  consult the relevant guide under `node_modules/next/dist/docs/` (client components,
  `inert`, CSS modules) and heed deprecation notices.
- Match repo conventions: prop-driven strings (no `useTranslations`), `cn()` from
  `@/lib/utils/cn`, semantic Tailwind tokens only (never raw hex), no comments unless they
  explain a non-obvious decision, server-first default. Copy the doc-comment tone of
  `mobile-nav.tsx`/`logo.tsx` for the new files.
- After dismissal the component must keep rendering `{children}` (returning `null` would
  unmount the page). Only the overlay subtree is conditional.
