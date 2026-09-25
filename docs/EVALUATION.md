# CommonGround — Testing & Evaluation Plan

## Automated test coverage (current)

`npm test` runs the Vitest suite (colocated `__tests__/` directories). It covers:

- **Community configuration:** both built-in configs validate against `CommunityConfigSchema`;
  every category pairs an icon with a text label; the demo community is labeled fictional;
  runtime-created communities (validation, duplicate names, unique case-number prefixes, no
  invented sources) — `src/lib/schema/__tests__/`,
  `src/lib/store/__tests__/community-store.test.ts`.
- **Cases and privacy:** case-number format and prefixes, approximate-area handling (never an
  exact address), consent records, image validation, the public serializer never exposing
  private fields (`public-case.test.ts`), status explanations, trends, duplicate clusters.
- **Search:** server-side search and filters, including rejection of invalid input
  (`src/lib/explore/`, `src/lib/store/__tests__/search-and-communities.test.ts`).
- **Community map:** illustrative pin placement stays within each case's approximate area and
  pins never overlap (`positions.test.ts`); street-map zones sit in their configured direction,
  never overlap, fit the initial view, and are never invented for an area without a direction;
  the fictional demo has no real-map settings (`geo.test.ts`, both in `src/lib/map/__tests__/`).
  Map settings from the admin form are validated, including duplicate directions
  (`community-store.test.ts`).
- **Moderation:** admin actions reject unauthenticated calls, verification sources must be real
  http/https URLs, admin pages guard themselves.
- **Guide and agents:** emergency-phrase detection in all seven languages, the draft tool,
  read-only tools, multi-agent case analysis with deterministic suggestion validation and the
  critique pass, and the briefing — all with the model mocked, so no live API calls.
- **Languages:** every interface string exists in all seven languages with matching
  placeholders (`src/lib/i18n/__tests__/completeness.test.ts`).

A separate live eval suite (`npm run eval:guide-safety`, `src/lib/guide/__evals__/`) runs
adversarial scenarios against the real Guide (invented contacts, false claims of submission or
closure, premature drafting, medical/legal refusals, emergencies, asking for an exact location).
It needs a `GROQ_API_KEY`, makes real API calls, and is not part of `npm test` or CI.

## Accessibility checks (manual, every change touching UI)

Keyboard navigation, screen-reader labels, mobile layout (320/375/768/1440px), form errors,
reduced motion, the map's list alternative and text labels, focus management after submission,
empty states, slow-network behavior.

## Primary pilot success metric

At least 80% of test users should be able to:

1. Submit a complete report.
2. Do so in under three minutes.
3. Correctly explain the report's current status without assistance.

## Secondary metrics

Report completeness, time to submit, duplicate-detection accuracy, user understanding of
statuses, accessibility, AI unsupported-claim rate, emergency-escalation accuracy,
privacy-preserving location behavior, moderator accuracy, performance on low-end devices.

## Commands

```
npm test            # vitest run — must be green before any commit
npx tsc --noEmit     # typecheck — must be clean before any commit
npm run lint         # eslint — must be clean before any commit
npm run build        # production build — verified before any deploy
```
