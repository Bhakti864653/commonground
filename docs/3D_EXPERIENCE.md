# Historical decision record — 3D "Community Pulse" (removed)

> **Status: removed. This is not a current feature.** CommonGround has no 3D view and no 3D or
> WebGL dependencies. The current community map is a 2D, illustrative SVG map — see
> [`ARCHITECTURE.md`](ARCHITECTURE.md#community-map-and-approximate-locations).

## What it was

An optional 3D visualization of community activity, planned in the original spec and later built
with React Three Fiber and `three`. It was lazy-loaded, never the default view, and always had a
complete list alternative, reduced-motion handling, and a no-WebGL fallback.

## Why it was removed

The 2026-09-24 "community field notes" redesign replaced it with a 2D illustrative SVG map that
follows the reference design, loads without WebGL, and is simpler to make accessible. The
`three` / `@react-three/*` dependencies were removed afterwards. The last version with the 3D
view is recoverable from git history (commit `08ecaa6`).

## Principles that still apply to the current map

These carried over from the 3D plan and are enforced by the 2D map today:

- It shows where activity has been reported or proposed. It never measures neighborhood quality,
  danger, or urgency, and more markers never mean an area is worse.
- Locations are approximate areas only — never exact homes, addresses, or coordinates.
- It is never the only way to reach a case; the same cases are always available as a list.
- No constant motion, no flashing, no game-like points or leaderboards.
