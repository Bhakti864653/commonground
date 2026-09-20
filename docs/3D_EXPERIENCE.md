# CommonGround — "Community Pulse" 3D Experience Plan

## Purpose

An optional 3D visualization of anonymized community activity and case status, calm and
non-alarming. It never implies that a neighborhood is morally worse, objectively more dangerous,
that more reports mean greater urgency, or that activity equals community quality. This
explanation always appears above the view:

> "Community Pulse shows where activity has been reported or proposed. It does not measure
> neighborhood quality, danger, or urgency."

## Why React Three Fiber

This project is Next.js/React (confirmed at Phase 1 repo inspection — the repo was empty, so
Next.js/TypeScript/Tailwind was chosen per the spec's own fallback instruction). Per spec §17,
that means React Three Fiber + `three`, isolated to one reusable component — never Threlte
(that's the Svelte path) and never a second frontend framework.

## Visual treatment

Abstract, low-poly community landscape: warm cream background, deep-ink labels, teal for
constructive proposals, yellow for under-review items, coral reserved only for verified urgent
warnings. Soft lighting, no satellite imagery, no exact home locations, no constant rotation, no
flashing, no game-like points, no leaderboards.

## Interaction

Users can rotate/pan/zoom within reasonable limits. Selecting a marker opens a normal HTML
detail drawer (not a WebGL-rendered detail view) containing the complete text version of that
case — so nothing essential is ever locked inside WebGL. A "View as list" control and full
reduced-motion support are always available. Keyboard and screen-reader users can reach every
item without touching the 3D canvas at all.

## Performance

Lazy-load the component (`next/dynamic`, `ssr: false`) so it never blocks initial page load.
Simple geometry, limited simultaneous objects, no large textures. Dispose of geometries,
materials, and listeners correctly on unmount. Provide a lightweight fallback (the same list
view used everywhere else) when WebGL is unavailable or the component fails to load. Tested on
narrow mobile widths and slow connections, same as every other view.

## Data

Reads the same `Report`/`Proposal` records as the 2D dashboard — no separate data model, no
separate privacy rules (still approximate-area-only, still no exact home locations, still no
per-neighborhood danger scoring).

## Status

Not yet built — this is the Phase 7 plan, approved alongside the rest of Phase 1's
documentation before implementation starts. `@react-three/fiber`/`three` are deliberately not
installed yet, to avoid bundling an unused 3D dependency into every page before Phase 7 begins.
