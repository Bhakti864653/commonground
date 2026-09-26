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
  defaultLanguage: Language;          // "es" | "en" | "pt" | "fr" | "zh" | "hi" | "it"
  supportedLanguages: Language[];
  status: "pilot" | "active" | "demo";
  categories: CategoryConfig[];       // id, label (English), labelEs, icon, optional `labels` for
                                      // other languages (icon always paired with text)
  areas: AreaConfig[];                // neighborhood | landmark | region; same label fields;
                                      // optional mapDirection: center | north | south | east | west
  trustedSources: SourceConfig[];     // name, url, lastVerifiedAt, trustLevel
  officialContacts: ContactConfig[];  // verified: boolean — false renders as "Por verificar"
  privacy: PrivacyConfig;             // anonymousByDefault (always true), consent version, consent
                                      // text in English/Spanish + optional `consentTexts`
  moderation: ModerationConfig;       // requireReviewBeforePublish, moderatorEmails
  enabledFeatures: FeatureFlags;      // mapView, threeDView, aiGuide, proposals, duplicateDetection
  map?: MapSettings;                  // { center: { lat, lng }, radiusKm } — the town's public
                                      // center point; enables the real street map
};
```

`map` and `mapDirection` together decide the street map: each area with a direction becomes a
zone around the center point. Leave `map` out for a fictional community (it must never appear
on real streets) or when no reliable center point is known; the community then gets the
illustrative map. The center must be a public reference point for the town (for example from
OpenStreetMap), never a resident's or anyone's home.

Missing translations fall back to English. `enabledFeatures.threeDView` is a legacy flag left in
the schema: nothing reads it, and there is no 3D view.

Full field-level types: `src/lib/schema/community.ts`. Model-name aliases required by the
original spec (`ReportCategory`, `Source`, `OfficialContact`) are exported from the same file.

## Configured communities

### `santiago-veraguas` — pilot

- Country: Panama · Region: Veraguas
- Default language: Spanish (a visitor whose browser prefers another of the seven interface
  languages starts in that one instead; the language menu always overrides); area and category
  names and consent text are provided in all seven
  interface languages
- Status: `pilot`
- Categories: flooding/blocked drainage, garbage/sanitation, damaged roads/infrastructure,
  other
- `trustedSources` and `officialContacts` hold only entries checked against a real, official page
  (spec §23/§26: never invent official contacts or government actions). As of the 2026-09-25
  verification pass ([`MCP_RESEARCH_AUDIT.md`](MCP_RESEARCH_AUDIT.md)): 911 (sourced from SUME
  9-1-1), the fire department's 103 (bomberos.gob.pa), SINAPROC's 24-hour WhatsApp emergency line
  (sinaproc.gob.pa), and the Alcaldía de Santiago's office line 935-2444 (alcaldiadesantiago.gob.pa),
  plus five approved source websites. A municipal WhatsApp number was left out because no
  official page states what it is for.
- Every contact and source carries `verified`, `lastVerifiedAt`, and an optional public
  `verificationNote`. `src/lib/sources/freshness.ts` turns those into current / review due
  (checked more than 180 days ago) / unverified; an entry without a valid check date is never
  shown as verified. They are shown on the public `/resources` page with
  their source and check date; moderators can add or remove entries at `/admin/sources`.
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

There are two ways:

**Built-in (defined in source code):**

1. Add a new `CommunityConfig` object under `src/data/communities/`, validated through
   `CommunityConfigSchema.parse(...)` at module load (fails fast on a bad config).
2. Add it to the `COMMUNITIES` array in `src/data/communities/index.ts`.
3. No core component should need to change — if one does, that's a sign something is
   accidentally hard-coded to a specific community and should be pulled into the config schema
   instead.

**Starter communities (temporary prototype):** when a visitor adds a place (country + city, with
optional region and neighborhood), a `status: "starter"` community is started for it unless the
place already has one: general categories (flooding, garbage, roads, street lighting, other), the
five compass areas without map directions (illustrative map only — no coordinates are stored), no
contacts or sources, and a "not reviewed yet" notice on every page. At most 300 exist at once. A
moderator's "Mark reviewed" turns one into a `pilot`.

**At runtime (temporary prototype):** a moderator can set one up at `/admin/communities` with a
name, country, optional region, 1–12 approximate areas (Spanish and English names), and
categories from the presets in `src/data/communities/category-presets.ts` ("Other" is always
included). It gets a unique id and case-number prefix, all seven interface languages, and no
trusted sources or official contacts. It is stored in memory only, so it is lost on a restart or
redeploy (and may be missing on another serverless instance) until a database is added. See
[`ARCHITECTURE.md`](ARCHITECTURE.md#communities-created-at-runtime-prototype).

## Test coverage

`src/lib/schema/__tests__/community-config.test.ts` verifies: both configs validate against the
schema, the two communities differ in every dimension that matters (language, categories,
country) while sharing one schema, every category carries both an icon and a text label, and the
demo community is visibly labeled as fictional. `src/lib/store/__tests__/community-store.test.ts`
covers runtime-created communities, and `src/lib/i18n/__tests__/completeness.test.ts` checks that
every built-in area, category, and consent text exists in every language.
