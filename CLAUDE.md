@AGENTS.md

# CommonGround

## Project identity

CommonGround is an **independent, multilingual, privacy-preserving civic-action platform**.
It helps communities turn scattered local observations (flooding, garbage, damaged
infrastructure, local needs) into organized, verified information and trackable collective
action.

Tagline: "Turn local knowledge into shared action." / "Del conocimiento local a la acción
colectiva."

**CommonGround does not represent any government, municipality, emergency service, public
institution, or nonprofit.** This footer must appear on every page:

> "CommonGround is an independent community technology project. It does not represent any
> government, municipality, emergency service, or public institution."
> "CommonGround es un proyecto independiente de tecnología comunitaria. No representa a ningún
> gobierno, municipio, servicio de emergencia ni institución pública."

## Product purpose

CommonGround helps a resident: document a problem or propose a solution, understand what
happens to it next, tell verified information apart from community submissions, find a real
next step, and participate without exposing personal information. It never promises a problem
will be solved — it makes the process clearer, safer, and more accountable.

Full product requirements: [`docs/PRD.md`](docs/PRD.md).

## Location rules

- The first pilot community is **Santiago de Veraguas, Panama** — use that exact phrase.
- Never mention David, Chiriquí, Cherokee, or any other location unless a user explicitly
  enters it.
- The core app is never hard-coded to one community, language, or government system — see
  [`docs/COMMUNITY_CONFIG.md`](docs/COMMUNITY_CONFIG.md) for the `CommunityConfig` schema that
  makes every community (categories, areas, languages, sources, contacts, moderation, privacy
  defaults, enabled features) fully configurable.
- A second, wholly fictional community (`riverbend-demo`) exists solely to prove the schema
  generalizes. It must always be visibly labeled as fictional demonstration data.

## Safety rules

CommonGround is **not** an emergency dispatch system, not a replacement for local emergency
services, not a medical or legal service, and not a platform for public accusations,
harassment, or vigilantism. The CommonGround Guide assistant must never invent contacts,
addresses, officials, deadlines, or government responses; never promise a problem will be
fixed; never diagnose illness or give legal conclusions; never auto-submit, forward, or close a
case without explicit confirmation. See [`docs/PRIVACY.md`](docs/PRIVACY.md) for the full
privacy/safety constraint list and the emergency-phrase detection list.

## Architecture

Next.js (App Router) + TypeScript + Tailwind CSS, in-memory prototype persistence (no database
yet — cases and runtime-created communities are temporary), Zod for runtime-validated typed
models (`CommunityConfig`, `Report`, `Proposal`, status/verification enums, etc. — see
`src/lib/schema/`). Full detail:
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Commands

```
npm run dev          # start the dev server
npm run build         # production build
npm run lint          # eslint
npx tsc --noEmit      # typecheck
npm test              # vitest, single run
npm run test:watch    # vitest, watch mode
```

All four (`build`, `lint`, `tsc --noEmit`, `test`) must be clean before any commit that touches
`src/`.

## Testing requirements

Every pure-logic module (case-number generation, status transitions, duplicate detection,
privacy-preserving location display, emergency-phrase detection, AI-guide refusal behavior) gets
unit tests colocated in a `__tests__/` directory next to the module. See
[`docs/EVALUATION.md`](docs/EVALUATION.md) for the full test/evaluation plan and the pilot
success metric.

## UI conventions

Guided multi-step flows, not single giant forms — always show step progress ("Paso 2 de 5").
Icons are never shown without a paired text label. Color is never the only signal for meaning
(status, verification state, urgency) — always pair with text/icon. Spanish-first copy for the
Santiago de Veraguas pilot; the interface is also available in English, Portuguese, French,
Simplified Chinese, Hindi, and Italian, and every interface string must exist in all seven
(`src/lib/i18n/__tests__/completeness.test.ts` enforces it). Full design system:
[`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md).

## Privacy constraints

Anonymous-by-default. Never require a name, phone number, or exact address. Never publicly show
exact coordinates or reporter identity. Admin notes are always private. See
[`docs/PRIVACY.md`](docs/PRIVACY.md) and [`docs/MODERATION.md`](docs/MODERATION.md).

## Community map requirements

The home page community map is a 2D, illustrative SVG map (`src/components/map/`), not a
geographic map and not 3D (the earlier 3D view was removed — see the historical record in
[`docs/3D_EXPERIENCE.md`](docs/3D_EXPERIENCE.md)). It must: place cases only by approximate
area, never by an exact location; never be the only way to reach a case (the list is always
available); label every pin in text and explain every pin color; and never imply that more
activity means a neighborhood is worse, more dangerous, or more urgent.
