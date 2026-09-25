# CommonGround

An independent, multilingual, privacy-preserving civic-action platform. CommonGround helps a
community turn scattered local observations (flooding, garbage, damaged infrastructure) into
organized, verified information and trackable collective action — never a replacement for
official emergency services, and never a guarantee that a problem will be solved.

> "CommonGround es un proyecto independiente de tecnología comunitaria. No representa a ningún
> gobierno, municipio, servicio de emergencia ni institución pública."

## Live pilot community

**Santiago de Veraguas, Panamá** (Spanish-first). A second, wholly fictional community
(**Riverbend**) exists only to prove the platform's `CommunityConfig` schema generalizes to a
different country/language/category set — it is always visibly labeled as demonstration data.

## Languages

The interface is available in seven languages: **Spanish** (default for the pilot), **English**,
**Portuguese** (Brazilian), **French**, **Simplified Chinese**, **Hindi**, and **Italian**. That
covers every interface string, the built-in communities' area and category names, the consent
text, emergency-phrase detection, and the Guide's replies. What residents write themselves (case
descriptions) is never machine-translated. Areas a moderator creates at runtime have Spanish and
English names only, and fall back to English in the other languages. A test
(`src/lib/i18n/__tests__/completeness.test.ts`) fails if any interface string is missing a
language.

## Features

- **Guided report/proposal flow** — a 5-step wizard (type → category → description/photo →
  privacy-preserving area → review + consent). Never asks for a name, phone number, or exact
  address; photos are validated (type/size) and only their metadata is ever kept, never the
  image itself.
- **Public case tracking** — every submission gets a public case number
  (`SV-2026-0001`-style, scoped per community per year), a real status history, and a visual
  "Observed → Organized → Reviewed → Connected → Updated" progress trail that only ever shows
  stages that actually happened.
- **Resident self-service** — anyone can flag a case as inaccurate for moderator review; a
  submitter can delete their own case via a one-time management link (there are no accounts at
  all, so this link is the only proof of ownership).
- **Community map** — for a community with a configured center point (Santiago de Veraguas),
  a real OpenStreetMap street map of the town (MapLibre GL, OpenFreeMap tiles, recolored to the
  app's palette). Each configured area is a soft zone placed by the direction it was given
  (center, north, south, east, west) and holds its cases' numbered markers — a case is never
  placed at a point on a street. Communities without a center point, including the fictional
  demo, keep an illustrative 2D SVG map. Either way, pin numbers match the numbered case list
  below the map, every zone looks the same regardless of how many cases it holds, and every case
  is also reachable from the plain list.
- **Explore** — search and filter the public case list by text, type, status, category, and
  area. Search and filtering run on the server (`searchCases`), with the filters validated at
  runtime; search ignores accents and matches the case number, description, and category/area
  names in Spanish and English. A case can also be opened directly by its case number.
- **Admin moderation** — a passphrase-gated local prototype (`/admin`) for status changes,
  verification marking (officially verified requires a real http/https source), duplicate
  marking, private notes, and reviewing the public inaccuracy-flag queue. Every action is
  recorded and attributed.
- **Prototype community setup** — moderators can set up an additional community at
  `/admin/communities`: a name, 1–12 approximate areas, and categories chosen from a fixed list
  (an "Other" category is always included). Each community gets a unique case-number prefix, so
  case numbers never collide across communities, and starts with no official sources or contacts
  (none are ever invented). **Communities created this way are temporary**: like submitted cases,
  they live in in-memory prototype storage and disappear on a server restart or redeploy — and on
  a serverless host, a different instance may not have them — until a real database is added.
  Places a visitor adds from the place selector (and the built-in "Panama City" entry) are just
  labels saved in that browser; they show a "not set up yet" notice, never sample data.
- **CommonGround Guide** — an agentic assistant (Groq) with two resident-facing capabilities
  (look up similar cases/explain the process, and draft-and-confirm a report or proposal
  conversationally — the resident always reviews and explicitly confirms before anything is
  created) and one admin capability: case analysis is a small multi-agent system — three
  independent specialist agents (duplicate/status/verification) run concurrently, then a
  critique agent reviews their combined output before a moderator ever sees it. A reasoning
  trace shows exactly what each agent did (including ones that found nothing), and a moderator
  always has to click Approve before anything actually changes. An on-demand community-briefing
  agent reasons over the whole case load for patterns/duplicates/stale cases, clearly labeled as
  AI-generated and on-demand (not a real scheduled job — this is a serverless prototype).
  Guide safety is covered by a live adversarial eval suite (`npm run eval:guide-safety`), not
  just unit tests.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Zod (every data shape is a
runtime-validated schema, the single source of truth) · Vitest · Groq (`groq-sdk`) for the
Guide's real reasoning. MapLibre GL (`maplibre-gl`) draws the street map from OpenFreeMap's
keyless OpenStreetMap tiles; there is no 3D view.

**Persistence (prototype phase):** in-memory stores (`src/lib/store/case-store.ts` for cases,
`src/lib/store/community-store.ts` for runtime-created communities), `globalThis`-backed so they
survive dev-mode hot reload. There is no database yet: submitted cases and created communities
are lost on a restart or redeploy, and on a serverless host (Vercel) they aren't shared between
instances. A fixed set of clearly labeled demonstration cases is re-seeded whenever a store
starts empty. A real database is the documented next step, per `docs/ARCHITECTURE.md`.

## Architecture notes

```mermaid
flowchart LR
  Resident -->|submit / browse / chat| AppShell["(app)/ resident shell"]
  AppShell --> Store["case-store.ts (mock, in-memory)"]
  AppShell -->|Explore search| Search["searchCases (server)"]
  Search --> Store
  AppShell --> Guide["Guide (resident chat)"]
  Guide -->|tool calls| Store
  Guide -->|reasoning| Groq[(Groq API)]
  Moderator -->|passphrase| Admin["/admin (gated)"]
  Admin --> Store
  Admin --> Orchestrator["case-analysis.ts (orchestrator)"]
  Orchestrator --> DupAgent["duplicate agent"]
  Orchestrator --> StatusAgent["status agent"]
  Orchestrator --> VerifyAgent["verification agent"]
  DupAgent & StatusAgent & VerifyAgent --> Critique["critique agent"]
  Critique -->|kept suggestions| Store
  DupAgent -->|reasoning + tools| Groq
  Critique -->|reasoning| Groq
  Admin --> Briefing["briefing agent (on-demand)"]
  Briefing -->|reasoning + tools| Groq
  Admin -->|approve suggestion| Store
  Admin -->|set up community| Communities["community-store.ts (in-memory)"]
```

- `src/lib/schema/` — every `Report`/`Proposal`/`CommunityConfig` shape as a Zod schema.
  `PublicCase` (a structural `Omit` of every private field) is what any resident-facing code
  path is allowed to touch — private notes, moderation history, and Guide suggestions can't
  reach a public page even by accident, enforced at the type level, not just by convention.
- `src/app/(app)/` — the resident-facing shell (sidebar, top bar with the place selector and
  language/theme controls, phone bottom nav, footer). `src/app/admin/` is a sibling of that
  route group, not nested inside it, so it never inherits that shell.
- `src/components/map/` — `CommunityMap.tsx` (chooses the street map or the illustration),
  `StreetMap.tsx` (the MapLibre street map with area zones), `CasePin.tsx` (the shared numbered
  marker), and the "not set up yet" notice for places without a community. Zone geometry comes
  from `src/lib/map/geo.ts` (the community's public center point plus each area's configured
  direction); illustrative pin positions come from `src/lib/map/positions.ts`. Neither ever
  uses a real location from a resident.
- `src/lib/guide/` — the Guide's tools (read-only, public-fields-only), the resident chat
  (`chat.ts`, plus `draft-submission.ts` for the draft-and-confirm tool), the multi-agent case
  analysis (`sub-agents.ts`'s three specialists + `critique.ts`'s reflection pass, orchestrated
  by `case-analysis.ts`), and the on-demand `briefing.ts`. The Guide never mutates a case
  directly; approving a suggestion calls the exact same functions the manual moderation panel
  buttons do, and a drafted chat submission only ever becomes real via the resident's own
  confirm click, which calls the same `submitCase` path the manual wizard uses.
  `src/lib/guide/__evals__/` holds the live safety eval suite (run separately from `npm test`,
  see Commands below).
- Full behavioral/privacy/moderation rules live in `docs/` (`PRIVACY.md`, `MODERATION.md`,
  `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `COMMUNITY_CONFIG.md`) — read those before changing
  anything safety- or privacy-adjacent. `docs/3D_EXPERIENCE.md` is a historical decision record
  for a 3D view that was built and then removed; it does not describe a current feature.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in ADMIN_ACCESS_CODE / GROQ_API_KEY if you need /admin or the Guide
npm run dev
```

Neither env var is required for the resident-facing app to run — `/admin` shows a login form
regardless, and the Guide degrades to "not available right now" rather than erroring.

## Commands

```bash
npm run dev          # start the dev server
npm run build        # production build
npm run lint         # eslint
npx tsc --noEmit     # typecheck
npm test             # vitest, single run
npm run eval:guide-safety  # live adversarial safety eval against the real Groq API (needs GROQ_API_KEY, costs real calls — not part of `npm test`/CI)
```

All four (`build`, `lint`, `tsc --noEmit`, `test`) must be clean before any commit that touches
`src/` — enforced in CI on every push/PR (`.github/workflows/ci.yml`).

## License

MIT — see [`LICENSE`](LICENSE).

## What I learned

See [`DEVLOG.md`](DEVLOG.md) for the real bugs hit while building this — the two most
significant: a private-moderator-notes leak into every public case page's own data (caught in
a deliberate final review pass, not by a user report), and this repo's stricter
`react-hooks/set-state-in-effect` lint rule, which repeatedly rejected the "obvious"
localStorage/browser-API read-on-mount pattern in favor of `useSyncExternalStore`.
