# CommonGround — Architecture

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript, Turbopack default).
- **Styling:** Tailwind CSS v4, design tokens in `src/app/globals.css` (see
  [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)).
- **Validation/typing:** Zod schemas as the single source of truth for every data shape, with
  TypeScript types inferred via `z.infer<>` (`src/lib/schema/`). Nothing bypasses schema
  validation on write.
- **Persistence (this prototype phase):** local mock persistence (in-memory + JSON fixtures
  under `src/data/`), matching the spec's Phase 1–2 instruction not to add paid services, real
  secrets, or a real database until the prototype's shape is validated. A real database
  (Postgres/Supabase, matching the stack used on Synaptiq/Concord) is a natural later swap —
  the schema layer is designed so persistence can change without touching components.
- **Testing:** Vitest + Testing Library (`jsdom` environment), colocated `__tests__/`
  directories next to the modules they cover.
- **Communities:** the built-in configs in `src/data/communities` plus any a moderator sets up at
  `/admin/communities` (`lib/store/community-store.ts`). Each gets a unique case-number prefix.
  Runtime-created communities use the same in-memory prototype storage as cases, so they don't
  survive a restart or redeploy until a database is added.
- **Search:** Explore filters and searches on the server (`searchCases` in `lib/store/actions.ts`,
  using `lib/explore/filter-cases.ts`), with runtime-validated input.
- **Community map:** a 2D, illustrative SVG map (`components/map/`), not geographic — pins are
  placed only by approximate area. The earlier React Three Fiber 3D view was removed in the
  2026-09-24 "community field notes" redesign, along with the `three`/`@react-three/*`
  dependencies (recoverable from commit `08ecaa6` if a 3D view is ever wanted again).

Next.js 16 breaking changes that matter for this codebase (confirmed against
`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`, not assumed from
training data): `params`/`searchParams` are async everywhere (`await params`); the `middleware`
filename/export is renamed to `proxy` (not needed yet — no proxy/middleware planned); `next
lint` is removed, ESLint is invoked directly (already reflected in `package.json`'s `lint`
script).

## Why this stack

Matches the pattern already proven across two other portfolio projects (Synaptiq, Concord):
Next.js App Router + TypeScript + Tailwind, typed schemas as the contract between data and UI,
Vitest for pure-function coverage. Reusing a known-good pattern rather than introducing a new
one for the last project before the portfolio site, given the Nov 2026 application deadline.

## Directory layout

```
src/
  app/                      route segments (App Router)
    (public)/               landing, how-it-works, community-guidelines, emergency info
    (app)/                  authenticated-ish app shell: dashboard, report/proposal flow,
                            case detail, settings — actually gated later if auth is added
    admin/                  local moderation prototype, clearly labeled
  components/
    layout/                 Sidebar, MobileNav, CommunitySelector, Footer
    report-flow/            the 5-step guided form
    dashboard/              case cards, filters, status timeline, action trail
    guide/                  CommonGround Guide chat UI
    map/                    illustrative community map (2D, approximate areas only)
  lib/
    schema/                 Zod schemas + inferred types (community.ts, report.ts, index.ts)
    guide/                  provider abstraction + mock knowledge base (Phase 6)
    matching/               duplicate-detection logic (Phase 3/4)
    privacy/                approximate-area helpers, consent helpers
  data/
    communities/            CommunityConfig instances (santiago-veraguas, riverbend-demo)
    demo/                   fictional demonstration reports/proposals, clearly labeled
docs/                       this documentation set
```

## Data flow

1. **CommunityConfig** is the root configuration object every other feature reads from —
   categories, areas, languages, trusted sources, official contacts, privacy defaults,
   moderation policy, and feature flags are all per-community, never hard-coded into a
   component. See [`COMMUNITY_CONFIG.md`](COMMUNITY_CONFIG.md).
2. A **Report** or **Proposal** (discriminated union on `type`) always carries: its owning
   community, category, description, an `ApproximateArea` (never an exact address), a status +
   full `statusHistory`, a `verificationState`, a `sourceType` (community vs. demonstration), and
   a `UserConsent` record (version + timestamp + language).
3. **Admin notes** and **moderation actions** are separate types from the public-facing case —
   never merged into the same object that gets serialized to a public API response, so there is
   no risk of accidentally leaking a private note.

## CommonGround Guide (assistant) architecture

A **provider abstraction** (`src/lib/guide/provider.ts`, Phase 6) sits between the UI and
whatever actually answers a question. The first implementation is a **local mock knowledge
base** — no paid API key, no real secret, deterministic and fully explainable, in keeping with
the project's own established preference (documented in uni-app-tracker's and Concord's DEVLOGs)
for rule-based/explainable behavior over an unaccountable black box wherever a rule-based
approach is honestly sufficient. A real LLM provider can be added later behind the same
interface without changing any calling code — matching the provider-abstraction pattern already
used for AI features on Synaptiq.

Every factual answer the Guide gives must carry: the active community, an approved source,
a source label, a last-verified date, and an explicit distinction between verified information
and community submissions. Full behavioral contract (what it can/must never do, emergency
detection): [`PRIVACY.md`](PRIVACY.md).

## Admin moderation architecture

A local prototype only (spec §21) — no external forwarding, no claim that any government
institution received anything. Every status change, duplicate mark, verification change, source
addition, or content removal is recorded as a `ModerationAction` with actor + timestamp, visible
in a moderation history. Full detail: [`MODERATION.md`](MODERATION.md).

## 3D Community Pulse architecture

Isolated to a single lazy-loaded component using React Three Fiber (this is a React/Next.js
project, so Threlte does not apply). It reads the same `Report`/`Proposal` data as the 2D
dashboard — no separate data model. Full plan: [`3D_EXPERIENCE.md`](3D_EXPERIENCE.md).

## What is deliberately NOT built yet (Phase 1)

Per the spec's own phased process: authentication (unless a later phase needs it), a real
database, the actual guided multi-step form, the dashboard, the admin page, the Guide assistant,
and the 3D view are all Phase 2+ work, built and tested incrementally after this planning phase
is approved.
