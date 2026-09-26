# MCP research audit — final validation pass

**Date:** 2026-09-25
**Scope:** a final validation pass on the finished CommonGround application, run with two MCP
research tools (Context7 for library documentation, Exa for civic-source verification). **This
was not part of the original build.** An earlier audit of the saved Claude Code session
transcripts found no verifiable evidence that either tool was used while CommonGround was being
built, so this document records the first time each was actually invoked for this project.

Neither Context7 nor Exa is a dependency of the application. They were used only as research
tools during this pass; nothing in `package.json` or the running app calls them.

## Connection check

- **Context7:** failed to connect when the session started (`CONNECT_TIMEOUT`). It was
  reconnected with `/mcp` before any research started.
- **Exa:** connected.

## Part 1 — Context7 (library documentation)

Installed versions, read from `node_modules` before querying: Next.js 16.3.5, React 19.2.8,
Zod 4.6.5, groq-sdk 1.6.0, maplibre-gl 5.24.0.

### Tool calls

| Tool | Input | Result used |
| --- | --- | --- |
| `resolve-library-id` | Next.js | `/vercel/next.js` (closest indexed version: `v16.2.9`) |
| `resolve-library-id` | Zod | `/colinhacks/zod` (`v4.0.1`) |
| `resolve-library-id` | Groq | `/groq/groq-typescript` |
| `resolve-library-id` | MapLibre GL JS | `/maplibre/maplibre-gl-js` (`v5.19.0`) |
| `resolve-library-id` | React | `/reactjs/react.dev` |
| `query-docs` | `/vercel/next.js/v16.2.9`: Server Function security, runtime validation | Server Actions must be treated as public endpoints; re-check authorization and validate arguments inside each one |
| `query-docs` | `/colinhacks/zod/v4.0.1`: deprecated string formats, `z.url` | `z.string().url()` and `z.string().email()` are deprecated; use `z.url()` / `z.email()`; `z.url({ protocol: /^https?$/ })` restricts the scheme |
| `query-docs` | `/groq/groq-typescript`: error handling, retries, timeout | API errors are `Groq.APIError` subclasses (`RateLimitError`, `APIConnectionError`, …); the client accepts `timeout` and `maxRetries` |
| `query-docs` | `/maplibre/maplibre-gl-js/v5.19.0`: `remove()`, reduced motion | `map.remove()` fully tears down the map and WebGL context; camera animations skip themselves under `prefers-reduced-motion` unless `essential: true` |
| `query-docs` | `/reactjs/react.dev`: effects | Data fetched in an effect needs an ignore/cancel flag in its cleanup to avoid race conditions; avoid synchronous `setState` in effects |

The exact version of Next.js installed (16.3.5) is newer than the newest version Context7 has
indexed (16.2.9); the Server Function guidance consulted has not changed between them.

### Findings and what changed

| Area | Finding | Result |
| --- | --- | --- |
| Zod | `z.string().email()` (deprecated) in `moderatorEmails` | **Changed** to `z.email()` — `src/lib/schema/community.ts` |
| Zod | Hand-written http(s) URL check duplicated in two schemas | **Changed** to the documented `z.url({ protocol: /^https?$/ })` in one shared `HttpUrlSchema`, now also used by `VerifiedSourceSchema` — `src/lib/schema/community.ts`, `src/lib/schema/report.ts`. Existing `javascript:` URL tests still pass. |
| Groq | `chat.completions.create` in the resident chat was not wrapped: a rate limit or timeout rejected the whole Server Action, and the chat UI stayed on "thinking" forever | **Changed**: `Groq.APIError` now returns the normal "unavailable" answer; other errors still surface — `src/lib/guide/chat.ts`. The chat also always leaves the pending state — `src/components/guide/GuideChat.tsx` |
| Groq | Client used the SDK's default timeout, far longer than a serverless request | **Changed** to an explicit `timeout: 30_000`, `maxRetries: 2` — `src/lib/guide/groq-client.ts` |
| Groq | Admin-side agents (`sub-agents.ts`, `critique.ts`, `briefing.ts`) | No change: each already catches failures and degrades to "unavailable" or "kept unchanged" |
| Next.js | `askGuideAction` passed the client's chat `history` to the model without validation, so a caller could inject a `system` turn | **Changed**: new `sanitizeHistory` (Zod) keeps only user/assistant turns, the last 6, capped at 4,000 characters each — `src/lib/guide/sanitize-history.ts`, `src/lib/guide/actions.ts` |
| Next.js | `reportInaccuracy` (public) accepted a note of any length | **Changed**: capped at 1,000 characters on the server (and in the form) — `src/lib/store/actions.ts`, `src/components/case/InaccuracyFlagForm.tsx` |
| Next.js | `deleteSubmission` (public) didn't check argument types | **Changed**: returns `false` for non-string arguments — `src/lib/store/actions.ts` |
| Next.js | Every admin Server Function already calls `requireAdmin()` first; admin pages guard themselves | No change needed |
| React | All data-fetching effects (`home`, `activity`, `resources`, `AgentDemo`, community context, street map) already use a cancel flag in cleanup | No change needed |
| MapLibre | `StreetMap` calls `map.remove()` and removes markers in its effect cleanup; it uses no camera animations, so there is nothing for reduced motion to skip | No change needed |
| Environment variables | `GROQ_API_KEY` and `ADMIN_ACCESS_CODE` are read only in server modules; no secret uses a `NEXT_PUBLIC_` prefix | No change needed |

## Part 2 — Exa (civic-source verification)

### Tool calls

| # | Tool | Query | Outcome |
| --- | --- | --- | --- |
| 1 | `web_search_exa` | official SINAPROC Panama emergency contact numbers sinaproc.gob.pa | Succeeded |
| 2 | `web_search_exa` | Benemérito Cuerpo de Bomberos de la República de Panamá official website emergency number 103 | Succeeded |
| 3 | `web_search_exa` | Panama national emergency number 911 SUME 911 official government page | Succeeded |
| 4 | `web_search_exa` | Municipio de Santiago de Veraguas official municipal website contact | Succeeded |
| 5 | `web_search_exa` | guidance on privacy-preserving citizen issue reporting platforms … | **Failed**: "You've hit Exa's free MCP rate limit" |
| 6 | `web_search_exa` | design system guidance for showing when content was last reviewed … | **Failed**: same rate-limit error |
| 7 | `web_fetch_exa` | https://alcaldiadesantiago.gob.pa/ | Succeeded |
| 8 | `web_search_exa` | GOV.UK Design System guidance on showing last updated dates and page history (retry of 6) | Succeeded |
| 9 | `web_search_exa` | data protection guidance for location data minimisation and anonymity … (retry of 5) | Succeeded |

### Sources retained

| URL | What it confirmed | Used for |
| --- | --- | --- |
| https://www.sinaproc.gob.pa/ and https://www.sinaproc.gob.pa/directorio-telefonico/ | "Línea de Emergencia 911 … WhatsApp 6998-4809 desde cualquier teléfono las 24 horas del día" | SINAPROC WhatsApp contact (source URL now points to the directory page); SINAPROC approved source |
| https://www.bomberos.gob.pa/ and https://www.bomberos.gob.pa/2025/08/05/vas-a-llamar-al-103-estas-son-las-recomendaciones-clave-para-una-atencion-rapida-y-efectiva/ | 103 is the fire service's direct line, available 24 hours | Bomberos 103 contact (source URL now the page that states it); Bomberos approved source |
| https://sume911.pa/ and https://sume911.pa/acerca-de/como-funciona | 9-1-1 is free from any phone; non-medical emergencies are transferred to police, fire, or civil protection | 911 contact now sourced from its operator (previously sourced from SINAPROC's page); SUME 9-1-1 added as an approved source |
| https://santiago.municipios.gob.pa/ | The municipality's official page on the national municipal portal | Kept as an approved source |
| https://alcaldiadesantiago.gob.pa/ | Official mayor's-office site for the district of Santiago, Veraguas, updated September 2026; lists "Tel: 935-2444 / 935-2445" and its office address | **Added** the Alcaldía as an approved source and 935-2444 as a verified, non-emergency office line |
| https://service-manual.nhs.uk/design-system/patterns/know-that-a-page-is-up-to-date | Show both a "last reviewed" and a "next review due" date, placed close to the content they describe | Shape of the freshness display (last-checked and next-review dates beside each entry) |
| https://interoperable-europe.ec.europa.eu/sites/default/files/document/2019-11/LocationPrivacyGuidelines_FINAL.pdf | Data minimisation: collect location only at the granularity the service needs; small areas raise re-identification risk | Confirms the existing approximate-area design; see limitations |

### Results rejected

| Result | Why |
| --- | --- |
| https://www.gov.uk/foreign-travel-advice/panama/getting-help | Secondary source (a foreign government's travel advice); it also lists "Ambulance: 103", which conflicts with the fire service's own site. Primary sources were available. |
| https://panama.justia.com/… (Ley 44 de 2007) | Third-party mirror of legislation; not needed to confirm a phone number |
| https://www.minseg.gob.pa/2024/07/sume-911-respuesta-inmediata-para-salvar-vidas/ | A 2024 news item; SUME 9-1-1's own site is the better primary source |
| SINAPROC office numbers (504-4728, 520-4429, 520-4435 …) | Administrative lines, not for residents in an emergency |
| SINAPROC landlines 520-4426/4427/4429 | Real emergency lines, but redundant with 911 and the 24-hour WhatsApp; not added to keep the list short |
| 998-1314 (municipal procurement department, from a 2024 tender notice) | Procurement, not a resident-facing service |
| Bomberos headquarters 512-6148 / 512-6400 | Administrative lines in Panama City, not the emergency line |
| The municipal WhatsApp +507 6935-2726 (removed earlier the same day) | Exa found nothing new that explains what the number is for; it stays removed |
| UK ICO location-data page; EDPB 2020 request; PANELFIT guidelines | Relevant background, but EU/UK-specific; the Interoperable Europe guideline was kept as the clearest statement of the same principle |

### Feature built from these findings: source freshness and provenance

- `src/lib/sources/freshness.ts`: one reusable utility. An entry is **current** (verified and
  checked within 180 days), **review_due** (verified, but older), or **unverified** (never
  verified, or its check date is missing, invalid, or in the future). `sortForReview` puts
  review-due, then unverified, before current. `canShowAsOfficial` stops an unverified or
  overdue source from being labelled "Official source".
- `src/components/sources/FreshnessBadge.tsx`: icon, text label, and an explanation in the
  accessible name, in all seven languages. It never relies on color alone.
- Public `/resources`: each contact and source shows its freshness, "Last checked", "Next review
  due", where it came from, and any verification note, plus a legend explaining the three
  labels. The "CommonGround is not an emergency service" notice is unchanged.
- Admin `/admin/sources`: a "Needs review" summary, review-due and unverified entries listed
  first, and a two-step "Mark re-checked today" action. That action is the only way a check date
  moves forward, and a contact without a source URL can't be marked verified.
- Schema: sources gained `verified` (default `false`) and an optional `verificationNote`, and
  `lastVerifiedAt` became optional; contacts gained `verificationNote`.

## Files changed

**Because of Context7 findings:** `src/lib/schema/community.ts`, `src/lib/schema/report.ts`,
`src/lib/guide/groq-client.ts`, `src/lib/guide/chat.ts`, `src/lib/guide/actions.ts`,
`src/lib/guide/sanitize-history.ts` (new), `src/lib/store/actions.ts`,
`src/components/guide/GuideChat.tsx`, `src/components/case/InaccuracyFlagForm.tsx`,
`src/lib/guide/__tests__/public-inputs.test.ts` (new).

**Because of Exa findings:** `src/data/communities/santiago-veraguas.ts`,
`src/lib/sources/freshness.ts` (new), `src/components/sources/FreshnessBadge.tsx` (new),
`src/app/(app)/resources/page.tsx`, `src/components/admin/CommunityInfoManager.tsx`,
`src/lib/store/community-store.ts`, `src/lib/store/admin-community-actions.ts`,
`src/lib/i18n/community-info.ts`, `src/lib/sources/__tests__/freshness.test.ts` (new),
`src/components/sources/__tests__/freshness-badge.test.tsx` (new),
`src/lib/store/__tests__/community-info.test.ts`, `docs/COMMUNITY_CONFIG.md`,
`docs/MODERATION.md`, and this file.

## Known limitations

- Exa's free tier rate-limited two searches; both were retried once and then succeeded. No
  other search was attempted, so this is not an exhaustive survey of Panamanian sources.
- Context7 has no index for Next.js 16.3.x; the 16.2.9 documentation was used.
- The 180-day review window is a project choice, not a figure from any source.
- Re-verification and runtime-added entries live in the same temporary prototype store as cases:
  they reset on a restart or redeploy. The built-in entries' 2026-09-25 dates always come back.
- The approximate-area design limits location precision, but an area with very few cases could
  still make a report easier to attribute (the re-identification risk the EU guideline
  describes). No change was made for this; it is noted for future work.
- No phone number was dialed. "Verified" means confirmed on the organization's own website on
  2026-09-25, not that a call was answered.
