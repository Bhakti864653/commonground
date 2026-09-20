# CommonGround — Community Configuration

CommonGround is global in architecture, local in implementation. Every community-specific
detail lives in a single typed `CommunityConfig` object (`src/lib/schema/community.ts`),
validated at runtime with Zod so a misconfigured community fails loudly at load time instead of
silently rendering broken or unsafe UI.

## Schema

```ts
type CommunityConfig = {
  id: string;
  displayName: string;
  country: string;
  region?: string;
  defaultLanguage: "es" | "en";
  supportedLanguages: ("es" | "en")[];
  status: "pilot" | "active" | "demo";
  categories: CategoryConfig[];       // each: id, label, labelEs, icon (icon always paired with text)
  areas: AreaConfig[];                // neighborhood | landmark | region
  trustedSources: SourceConfig[];     // name, url, lastVerifiedAt, trustLevel
  officialContacts: ContactConfig[];  // verified: boolean — false renders as "Por verificar"
  privacy: PrivacyConfig;             // anonymousByDefault (always true), consent text/version
  moderation: ModerationConfig;       // requireReviewBeforePublish, moderatorEmails
  enabledFeatures: FeatureFlags;      // mapView, threeDView, aiGuide, proposals, duplicateDetection
};
```

Full field-level types: `src/lib/schema/community.ts`. Model-name aliases required by the
original spec (`ReportCategory`, `Source`, `OfficialContact`) are exported from the same file.

## Configured communities

### `santiago-veraguas` — pilot

- Country: Panama · Region: Veraguas
- Default language: Spanish · Secondary: English
- Status: `pilot`
- Categories: flooding/blocked drainage, garbage/sanitation, damaged roads/infrastructure,
  other
- `trustedSources` and `officialContacts` start **empty** — every entry needs a real, checkable
  source before it ships (spec §23/§26: never invent official contacts or government actions).
- Moderator email is a placeholder (`moderator@commonground.example`) in committed source; the
  real value belongs in an environment variable at deploy time, matching how Concord's
  `ADMIN_EMAIL` was handled.

Location rule: use "Santiago de Veraguas, Panama" exactly. Never mention David, Chiriquí,
Cherokee, or any other location unless a user explicitly enters it.

### `riverbend-demo` — fictional demonstration community

Exists solely to prove the schema generalizes to a different country, default language, and
category set (streetlights, park maintenance, transit, other) without touching any core
component. `status: "demo"` and the display name itself say "fictional demonstration community"
— every surface that renders this community's data must carry a visible fictional-data label
(spec §3/§23).

## Adding a new community

1. Add a new `CommunityConfig` object under `src/data/communities/`, validated through
   `CommunityConfigSchema.parse(...)` at module load (fails fast on a bad config).
2. Add it to the `COMMUNITIES` array in `src/data/communities/index.ts`.
3. No core component should need to change — if one does, that's a sign something is
   accidentally hard-coded to a specific community and should be pulled into the config schema
   instead.

## Test coverage (Phase 1)

`src/lib/schema/__tests__/community-config.test.ts` verifies: both configs validate against the
schema, the two communities differ in every dimension that matters (language, categories,
country) while sharing one schema, every category carries both an icon and a text label, and the
demo community is visibly labeled as fictional.
