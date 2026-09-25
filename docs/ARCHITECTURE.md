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
- **Community map:** a responsive 2D, illustrative SVG map (`src/components/map/`), not a
  geographic map. There is no 3D or WebGL code or dependency. (An earlier React Three Fiber 3D
  view was built and then removed in the 2026-09-24 "community field notes" redesign — see the
  historical record in [`3D_EXPERIENCE.md`](3D_EXPERIENCE.md).)
- **Languages:** Spanish, English, Portuguese, French, Simplified Chinese, Hindi, and Italian
  (`src/lib/i18n/`). See [Internationalization](#internationalization) below.

Next.js 16 breaking changes that matter for this codebase (confirmed against
`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`, not assumed from
training data): `params`/`searchParams` are async everywhere (`await params`); the `middleware`
filename/export is renamed to `proxy` (not used — there is no proxy/middleware); `next lint` is
removed, ESLint is invoked directly (reflected in `package.json`'s `lint` script).

## Persistence (prototype limitation)

There is **no database yet**. Cases live in an in-memory store (`src/lib/store/case-store.ts`)
and runtime-created communities in another (`src/lib/store/community-store.ts`), both attached
to `globalThis` so they survive dev-mode hot reload. That means:

- Submitted cases and moderator-created communities are **lost on a server restart or
  redeploy**.
- On a serverless host (Vercel), each instance has its own memory, so something created in one
  request is not guaranteed to exist in a later one.
- When the case store starts empty, it seeds a fixed set of cases that are clearly labeled as
  demonstration data (`sourceType: "demonstration"`, `verificationState: "demonstration_data"`)
  so the agentic features always have something real to work on.

The schema layer is designed so a real database (e.g. Postgres/Supabase) can replace the stores
without touching components. Until then, nothing in the app should claim permanent storage.

## Why this stack

Matches the pattern already proven across two other portfolio projects (Synaptiq, Concord):
Next.js App Router + TypeScript + Tailwind, typed schemas as the contract between data and UI,
Vitest for pure-function coverage.

## Directory layout

```
src/
  app/                      route segments (App Router)
    (app)/                  resident-facing shell (no login — everything is anonymous)
      page.tsx              home: intro, community map, Guide + community pulse, latest cases
      activity/             Explore: server-side search and filters over the case list
      report/new/           the 5-step guided report/proposal flow
      cases/[caseNumber]/   public case page: status, verification, history, flag/delete
      guide/                the CommonGround Guide chat
      guide/how-it-works/   step-by-step demonstration of how the Guide works
      how-it-works/         plain-language explanation of the process
    admin/                  passphrase-gated moderation prototype, clearly labeled
      cases/[caseNumber]/   per-case moderation panel
      communities/          prototype community setup
  components/
    layout/                 Sidebar, TopBar, PlaceSelector, LocaleSwitch, ThemeToggle,
                            MobileNav, Footer, Logo, AppShell
    map/                    CommunityMap (illustrative 2D SVG map), UnconfiguredPlace notice
    journey/                CaseRow, StatusPill/VerificationPill, StageMeter
    report-flow/            the 5-step guided form (ReportWizard + steps)
    case/                   CaseView, inaccuracy flag, delete submission, case-number lookup
    guide/                  Guide chat, live action trail, draft review card, demonstration
    admin/                  moderation panel, analysis trace, briefing, community setup form
    icons/                  category icon map (icons always paired with text)
  lib/
    schema/                 Zod schemas + inferred types (community.ts, report.ts)
    store/                  in-memory case and community stores, resident + admin server actions
    guide/                  Guide chat, tools, draft tool, emergency detection, multi-agent
                            case analysis, critique, suggestion validation, briefing
    explore/                filter-cases.ts (search/filter logic used by searchCases)
    map/                    positions.ts (pin placement by approximate area)
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

The home page map is illustrative, not geographic. Areas whose ids are compass names (norte,
sur, este, oeste, centro) are placed where a resident would expect; any other areas are spread
evenly. Each pin is a real case, positioned only from its approximate area plus a fixed fan-out
pattern among that area's cases (`src/lib/map/positions.ts`) — **never from a real location**.
Exact addresses or coordinates are never stored from residents, and never displayed anywhere.
Cases whose resident preferred not to give an area sit in their own corner. Pin colors (needs
review / in progress / other) are always explained in a legend, and every pin has a text label.
The same cases are always available as a plain list, and more pins never mean an area is worse
or more dangerous.

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
`src/data/communities/category-presets.ts` ("Other" is always included). Names that already exist
are rejected, ignoring case and accents. Each community gets an id and a case-number prefix
(`casePrefix` in `src/lib/case-number/format-case-number.ts`) that no other community uses, so
case numbers never collide. New communities start with **no** trusted sources or official
contacts. They are stored in memory only — see [Persistence](#persistence-prototype-limitation).

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

A local prototype only (spec §21) — no external forwarding, no claim that any government
institution received anything. Status changes, duplicate marks, verification changes (officially
verified requires a real http/https source), and private notes are recorded as
`ModerationAction`s with actor + timestamp; reviewing a resident's inaccuracy flag marks that
flag reviewed with a timestamp. Case analysis runs three specialist
agents (duplicate, status, verification) concurrently, validates their suggestions
deterministically, has a critique agent review them, and validates again; a moderator must
approve each suggestion before anything changes. A community briefing runs on demand only —
there is no background scheduling. Full detail: [`MODERATION.md`](MODERATION.md).

## Known limitations (not built)

- No database: cases and runtime-created communities are temporary (see above).
- No resident accounts; ownership of a submission is proven only by its one-time management link.
- A single shared moderator access code, not a multi-moderator role system.
- No background or scheduled jobs; the briefing and case analysis run only when a moderator asks.
- No integration with any government or official system, and no forwarding of reports.
- No configured trusted sources or official contacts for any community yet.
