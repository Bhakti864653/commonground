# CommonGround — Testing & Evaluation Plan

## Unit test coverage (by phase)

- **Phase 1 (done):** `CommunityConfig` schema validation for both configured communities;
  category icon+label pairing; fictional-data labeling on the demo community.
  (`src/lib/schema/__tests__/community-config.test.ts`, 5/5 passing.)
- **Phase 3:** form validation, file/image validation, case-number generation (uniqueness,
  format, never encodes personal info), privacy-preserving location display (never resolves to
  an exact address), consent recording.
- **Phase 4:** status transitions (valid transitions only, history always append-only), source
  and verification-state labeling, "report inaccurate information" action.
- **Phase 5:** duplicate detection accuracy, moderation-action recording, private-note isolation
  (a public serializer must never include `AdminNote` fields — enforced by a type-level test,
  not just a runtime check).
- **Phase 6:** AI Guide refusal behavior (never invents a contact/official/deadline), source
  attribution present on every factual answer, emergency-phrase detection (Spanish + English),
  no forwarding/closing a case without explicit confirmation.
- **Phase 7:** 3D fallback when WebGL is unavailable, reduced-motion behavior, empty-data state,
  selecting a 3D item opens the correct HTML detail drawer.
- **Phase 1 sanity check (already run):** configuring a second community
  (`riverbend-demo`) without changing any core component — proven by the schema test suite
  reading both communities through the same `CommunityConfigSchema`.

## Accessibility checks (manual, every phase touching UI)

Keyboard navigation, screen-reader labels, mobile layout (320/375/768/1440px), form errors,
reduced motion, map/3D fallback, focus management after submission, empty states, slow-network
behavior.

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
