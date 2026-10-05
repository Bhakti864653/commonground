# CommonGround — Architecture

This describes the application as it exists now. For the history of how it got here (including
features that were built and later removed), see [`../DEVLOG.md`](../DEVLOG.md).

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript, Turbopack default).
- **Styling:** Tailwind CSS v4, design tokens in `src/app/globals.css` (see
  [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)). Light theme by default, optional dark theme.
- **Validation/typing:** Zod schemas as the single source of truth for every data shape, with
  TypeScript types inferred via `z.infer<>` (`src/lib/schema/`). New cases and communities are
  schema-validated on write, and server actions that take structured input (search filters,
  verification sources, new communities, the Guide's language) validate it at runtime.
- **AI:** Groq (`groq-sdk`) for the CommonGround Guide and the admin multi-agent analysis. Without
  a `GROQ_API_KEY` the Guide replies that it isn't available; nothing else depends on it.
- **Testing:** Vitest + Testing Library (`jsdom` environment), colocated `__tests__/`
  directories next to the modules they cover. A separate live eval suite
  (`src/lib/guide/__evals__/`, `npm run eval:guide-safety`) exercises the real Guide.
- **Community map:** a real street map (MapLibre GL, `maplibre-gl`, with OpenFreeMap's keyless
  OpenStreetMap tiles) for communities with a configured center point, and a 2D illustrative SVG
  map for the rest (`src/components/map/`). There is no 3D view. (An earlier React Three Fiber
  3D view was built and then removed in the 2026-09-24 "community field notes" redesign — see
  the historical record in [`3D_EXPERIENCE.md`](3D_EXPERIENCE.md).)
- **Languages:** Spanish, English, Portuguese, French, Simplified Chinese, Hindi, and Italian
  (`src/lib/i18n/`). See [Internationalization](#internationalization) below.

Next.js 16 breaking changes that matter for this codebase (confirmed against
`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`, not assumed from
training data): `params`/`searchParams` are async everywhere (`await params`); the `middleware`
filename/export is renamed to `proxy` (not used — there is no proxy/middleware); `next lint` is
removed, ESLint is invoked directly (reflected in `package.json`'s `lint` script).

## Persistence

**Cases** are stored in Postgres when `DATABASE_URL` is set (a free Neon project in production;
setup and privacy details in [`../db/README.md`](../db/README.md)), and otherwise in an
in-memory prototype store. Both sit behind one async API:

- `src/lib/store/case-store.ts` — what the rest of the app calls. `getCaseRepository()` picks
  Postgres when `DATABASE_URL` is set, and always the in-memory store under tests.
- `case-repository.ts` — the `CaseRepository` interface both stores implement.
- `sql-case-store.ts` — Postgres (tables in `db/migrations/0001_init.sql`). Multi-step writes
  run in one transaction with the case row locked; case numbers come from the database's
  `create_case` function, so they stay unique across servers.
- `memory-case-store.ts` — the in-memory store, attached to `globalThis` so it survives
  dev-mode hot reload. Its cases are lost on a restart, aren't shared between serverless
  instances, and it seeds the demonstration cases whenever it starts empty.
- `new-case.ts` — the validation both stores apply to a new submission.

`case-repository-contract.test.ts` runs the same behaviour tests against both stores.
Demonstration cases (`sourceType: "demonstration"`, `verificationState: "demonstration_data"`)
come from one list, `demo-seed.ts`, used by the in-memory store and by the generated
`db/seed.sql`.

**Communities** work the same way. The two built-in communities (`src/data/communities`) live
in code; everything created or changed at runtime — moderator-created and starter communities,
moderators' source/contact changes and their change log, and visitors' place requests — is
stored behind `community-store.ts` (`CommunityRepository` in `community-repository.ts`):
`sql-community-store.ts` in Postgres (tables in `db/migrations/0002_communities.sql`) or the
`memory-community-*` stores. The rules both use live in `community-logic.ts` and
`community-request-logic.ts`, and `community-repository-contract.test.ts` runs the same tests on
both. Unique constraints on a community's name and case-number prefix stop two servers from
creating the same place twice. Admin pages say whether changes are saved in the database or
only in this server's memory (`usesDatabase()` in `src/lib/db/storage-mode.ts`).

## Why this stack

Matches the pattern already proven across two other portfolio projects (Synaptiq, Concord):
Next.js App Router + TypeScript + Tailwind, typed schemas as the contract between data and UI,
Vitest for pure-function coverage.

## Directory layout

```
src/
  app/                      route segments (App Router)
    page.tsx                public introduction at "/" — outside the (app) shell, no sign-in
    (app)/                  resident-facing shell (no login — everything is anonymous)
      home/                 community dashboard: intro, map, Guide + community pulse, latest cases
      activity/             Explore: server-side search and filters over the case list
      report/new/           the 5-step guided report/proposal flow
      cases/[caseNumber]/   public case page: status, verification, history, flag/delete
      guide/                the CommonGround Guide chat
      guide/how-it-works/   step-by-step demonstration of how the Guide works
      how-it-works/         plain-language explanation of the process
      resources/            verified contacts and approved sources for the active community
    admin/                  passphrase-gated moderation prototype, clearly labeled
      cases/[caseNumber]/   per-case moderation panel
      communities/          prototype community setup
      sources/              add/remove a community's approved sources and official contacts
  components/
    layout/                 Sidebar, TopBar, PlaceSelector, LocaleSwitch, ThemeToggle,
                            MobileNav, Footer, Logo, AppShell
    map/                    CommunityMap (street map or illustration), StreetMap, CasePin,
                            UnconfiguredPlace notice
    journey/                CaseRow, StatusPill/VerificationPill, StageMeter
    report-flow/            the 5-step guided form (ReportWizard + steps)
    case/                   CaseView, inaccuracy flag, delete submission, case-number lookup
    guide/                  Guide chat, live action trail, draft review card, demonstration
    admin/                  moderation panel, analysis trace, briefing, community setup form
    icons/                  category icon map (icons always paired with text)
  lib/
    schema/                 Zod schemas + inferred types (community.ts, report.ts)
    store/                  case stores (Postgres + in-memory behind one API), community stores,
                            resident + admin server actions
    db/                     the server-only Postgres connection
    guide/                  Guide chat, tools, draft tool, emergency detection, multi-agent
                            case analysis, critique, suggestion validation, briefing
    explore/                filter-cases.ts (search/filter logic used by searchCases)
    map/                    geo.ts (street-map zones), positions.ts (illustrative pins)
    insights/               trends, duplicate clusters, status explanations
    i18n/                   languages, text tables, label helpers
    privacy/                approximate-area, consent, image-validation helpers
    places/                 browser-saved place names for the place selector
    case-number/            case-number format and per-community prefix
    journey/                action-trail stage helpers
    admin/                  admin auth (access code cookie)
    theme/                  light/dark theme
  data/
    communities/            built-in CommunityConfig instances (santiago-veraguas,
                            riverbend-demo) and the category presets for new communities
docs/                       this documentation set
```

## Data flow

1. **CommunityConfig** is the root configuration object every other feature reads from —
   categories, areas, languages, trusted sources, official contacts, privacy defaults,
   moderation policy, and feature flags are all per-community, never hard-coded into a
   component. The list of communities is the built-in configs plus any created at runtime
   (`listCommunities()` in `community-store.ts`); the browser loads it from the server. See
   [`COMMUNITY_CONFIG.md`](COMMUNITY_CONFIG.md).
2. A **Report** or **Proposal** (discriminated union on `type`) always carries: its owning
   community, category, description, an `ApproximateArea` (never an exact address), a status +
   full `statusHistory`, a `verificationState`, a `sourceType` (community vs. demonstration), and
   a `UserConsent` record (version + timestamp + language).
3. **Admin notes** and **moderation actions** are separate from the public-facing case. Every
   resident-facing code path uses `PublicCase` — a structural `Omit` of every private field — so
   a private note can't reach a public response, enforced at the type level.

## Community map and approximate locations

**Street map** (`StreetMap.tsx`, `src/lib/map/geo.ts`) — used when the community config has a
`map` setting: the town's public center point (from OpenStreetMap, never a resident's location)
and a radius. Each area with a configured `mapDirection` (center, north, south, east, west)
becomes a soft circular zone at a fixed offset from the center; the zones never overlap, and
all are drawn in the same color whatever their case count. A case is shown as a numbered marker
*inside its area's zone label* — never at a point on a street, because no case has one. Cases
with no area, or in an area without a direction, are listed as "Not on the map" beside the
legend. The base map is recolored to the app's `--map*` tokens (so it follows light/dark
theme), road-number shields are hidden, and one-finger drag / plain scroll are left to the page
(MapLibre's cooperative gestures, with localized hints). If WebGL is unavailable the map falls
back to the illustration. Attribution ("© OpenStreetMap · OpenFreeMap") is always visible under
the map heading.

**Illustrative map** (`MapArt` in `CommunityMap.tsx`, `src/lib/map/positions.ts`) — used for
communities without a `map` setting, including the fictional `riverbend-demo`, which must never
be drawn onto real streets. Areas whose ids are compass names (norte, sur, este, oeste, centro)
are placed where a resident would expect; any other areas are spread evenly. Each pin is placed
only from its approximate area plus a fixed fan-out pattern among that area's cases.

On both, exact addresses or coordinates are never stored from residents and never displayed;
marker colors (needs review / in progress / other) are always explained in a legend; every
marker has a text label; the numbers match the numbered case list; and the same cases are
always available as a plain list.

## Explore (search and filtering)

`searchCases(communityId, filters)` (`src/lib/store/actions.ts`) runs on the server. The filters
(text query, type, status, category, area, or "no area given") are validated with Zod at
runtime; invalid input or an unknown community returns an empty result rather than an error.
The text search ignores case and accents and matches the case number, the description, and
category/area names in Spanish and English. Results keep each case's position in the
community's newest-first list, so its number matches its pin on the home map. Only `PublicCase`
fields are ever returned.

## Communities created at runtime (prototype)

Moderators can set up a community at `/admin/communities` (`adminCreateCommunity`, admin-only).
Input is validated at runtime: a 2–60 character name, a country, an optional region, 1–12
approximate areas (Spanish and English names), and categories from the fixed presets in
`src/data/communities/category-presets.ts` ("Other" is always included). Optionally, a street-map
center (valid latitude/longitude) and radius (0.3–30 km), plus a direction per area — no two
areas may share a direction, and directions are dropped if no center is given. Names that already exist
are rejected, ignoring case and accents. Each community gets an id and a case-number prefix
(`casePrefix` in `src/lib/case-number/format-case-number.ts`) that no other community uses, so
case numbers never collide. New communities start with **no** trusted sources or official
contacts. They are stored like cases — see [Persistence](#persistence).

The resident place selector also lists a "Panama City" entry and any names a visitor adds.
Those are labels saved in the visitor's browser, not communities: choosing one shows a "not set
up yet" notice instead of cases, forms, or the Guide. Once a moderator creates a real community
with the same name, that placeholder is hidden.

## Internationalization

`src/lib/i18n/languages.ts` defines the seven languages (code, native name, HTML `lang`, date
locale, and the language name the Guide is asked to reply in). Interface text lives in typed
tables (`dictionary.ts`, `field-notes.ts`, `experience.ts`, plus status/verification labels in
`src/lib/schema/report.ts`) where every entry has all seven languages;
`src/lib/i18n/__tests__/completeness.test.ts` fails if any is missing or has mismatched
`{placeholders}`. Config data (area/category names, consent text, status notes) always has
English (`label`) and Spanish (`labelEs`) and may carry more languages in `labels` /
`consentTexts` / `notes`; anything missing falls back to English (`labelOf`, `consentTextOf`,
`noteOf` in `src/lib/i18n/labels.ts`). Resident-written descriptions are never machine-translated.
The chosen language is kept in memory and resets on reload.

## CommonGround Guide (assistant) architecture

The resident Guide (`src/lib/guide/chat.ts`, called through the `askGuideAction` server action)
uses Groq with a bounded tool loop. Before any model call, the message is checked against a
deterministic emergency-phrase list (`emergency.ts`, all seven languages); a match returns the
emergency notice without calling the model at all. The Guide's tools are read-only and return
only public case fields; its one write-adjacent tool, `draft_case_submission`, only prepares a
draft that the resident must review and explicitly confirm before `submitCase` runs. It is told
to ask only for a configured approximate area (never a street, address, name, or phone), to use
category names in the resident's language, and to say honestly that a community has no
approved sources when none are configured — no community has any configured yet. Full
behavioral contract: [`PRIVACY.md`](PRIVACY.md).

The resident Guide page shows a live action trail built only from facts the page can confirm
(active community, emergency-check result, draft fields, configured sources, approval points);
it never shows the model's private reasoning.

## Admin moderation architecture

A local prototype only (spec §21) — nothing is sent automatically (AI-prepared referrals are
delivered by a moderator, by hand, after approval — see [`MODERATION.md`](MODERATION.md#referrals)),
no claim that any government
institution received anything. Status changes, duplicate marks, verification changes (officially
verified requires a real http/https source), and private notes are recorded as
`ModerationAction`s with actor + timestamp; reviewing a resident's inaccuracy flag marks that
flag reviewed with a timestamp. Case analysis runs three specialist
agents (duplicate, status, verification) concurrently, validates their suggestions
deterministically, has a critique agent review them, and validates again; a moderator must
approve each suggestion before anything changes. A community briefing runs on demand only —
there is no background scheduling. Full detail: [`MODERATION.md`](MODERATION.md).

## Known limitations (not built)

- Without `DATABASE_URL` (e.g. a fresh local checkout), everything created at runtime is kept
  in memory and is temporary (see [Persistence](#persistence)).
- No resident accounts; ownership of a submission is proven only by its one-time management link.
- A single shared moderator access code, not a multi-moderator role system.
- No background or scheduled jobs; the briefing and case analysis run only when a moderator asks.
- No integration with any government or official system, and no automatic forwarding of
  reports. Referrals are delivered by a moderator by hand.
- No follow-ups or scheduled reminders for referrals (no scheduler yet).
- No configured trusted sources or official contacts for any community yet.
- Street-map zones are symbolic circles at fixed offsets from the town center, not real
  neighborhood boundaries; no community has boundary data.
