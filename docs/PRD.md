# CommonGround — Product Requirements

## Product identity

- **Name:** CommonGround
- **Tagline:** "Turn local knowledge into shared action." / "Del conocimiento local a la acción
  colectiva."
- **Description:** CommonGround is a multilingual, privacy-preserving civic-action platform
  that helps communities transform scattered local observations into verified information,
  constructive proposals, and trackable collective action.
- **Independence statement:** CommonGround is independent technology. It does not represent any
  government, municipality, emergency service, public institution, or nonprofit. This appears
  in the footer of every page, in both languages (see `CLAUDE.md`).

## The problem

People know what is wrong in their community but often lack a trusted, simple, accountable way
to turn that local knowledge into coordinated action. Information about flooding, garbage,
unsafe infrastructure, missing services, and local needs is scattered across messaging apps,
conversations, social media, and official websites. Residents may not know whether a problem
has already been reported, who is responsible, what evidence is needed, whether anyone received
it, whether it's verified, what happened afterward, or how to participate given language,
accessibility, connectivity, or privacy concerns.

CommonGround helps people:

1. Document a problem or propose a constructive solution.
2. Organize the information.
3. Identify the appropriate next step.
4. Distinguish verified information from community submissions.
5. Connect with relevant local resources or organizations.
6. Follow the issue's progress transparently.
7. Participate without unnecessarily exposing personal information.

CommonGround must never promise that every problem will be solved. It makes the process
clearer, safer, more organized, inclusive, and accountable — nothing more.

## Positioning

CommonGround is: "An independent civic-action platform that helps communities turn local
knowledge into shared action."

CommonGround is **not**: an official government app, an emergency dispatch system, a
replacement for 911/local emergency services, a social-media replacement, a medical service, a
legal service, a platform for public accusations, a platform for harassment or vigilantism, or
an AI that guarantees a problem will be solved.

## Global product, local communities

CommonGround is global in architecture, local in implementation. The core application is never
hard-coded to one community, government system, or language — every community is described by a
typed `CommunityConfig` (full schema: [`COMMUNITY_CONFIG.md`](COMMUNITY_CONFIG.md)).

- **Pilot community:** Santiago de Veraguas, Panama (`santiago-veraguas`). Primary language
  Spanish, secondary English. Initial categories: flooding/blocked drainage, garbage/sanitation,
  damaged roads/infrastructure (plus "other"). Use "Santiago de Veraguas, Panama" exactly; never
  mention David, Chiriquí, Cherokee, or any other location unless a user explicitly enters it.
- **Second, fictional community:** Riverbend (`riverbend-demo`) — proves the schema generalizes
  to a different country/language-default/category set. Always visibly labeled as fictional
  demonstration data.

## Core MVP goal

A resident can:

1. Select a community.
2. Submit a local problem or constructive proposal.
3. Submit in Spanish or English.
4. Provide a description.
5. Select an approximate area without exposing an exact home location.
6. Review the submission before sending.
7. Receive a public case number.
8. See the case status and status history.
9. Understand which information is community-submitted vs. verified.
10. Find a trusted next step or approved source.
11. Report inaccurate information.
12. Delete their submission where appropriate.

**Pilot question:** "Can CommonGround help residents submit clearer, safer, better-organized
reports and understand what happens to them afterward?"

## Feature scope (full spec)

- Guided multi-step report/proposal flow with a review step and privacy-preserving location.
- Public case number + confirmation page (no guarantee-of-response language).
- Activity views (a case list plus an illustrative 2D community map) — never social-media-shaped
  (no likes, followers, popularity rankings, outrage scores). The original spec also allowed an
  optional 3D "Community Pulse"; it was built and later removed, and is not part of the current
  product (see [`3D_EXPERIENCE.md`](3D_EXPERIENCE.md), a historical record).
- Status system: Received → Under review → In discussion → Referred → In progress → Updated →
  Closed → Not verifiable, each with a plain-language explanation, date, actor/source type, and
  verification state. A separate "Observed → Organized → Reviewed → Connected → Updated" action
  trail visualizes real progress — never animated to a stage that hasn't actually happened.
  Details: [`ARCHITECTURE.md`](ARCHITECTURE.md).
- Detail page per case: full history, verification/source labels, inaccurate-information action.
- CommonGround Guide: a controlled, source-grounded assistant (not a magical/central feature) —
  classification, missing-info prompts, duplicate detection, approved-source retrieval,
  translation/simplification, status explanation, emergency-phrase detection. Full behavior
  contract: [`PRIVACY.md`](PRIVACY.md) §AI Guide.
- Local admin moderation prototype: status changes, duplicate marking, verification, private
  notes, moderation history. Detail: [`MODERATION.md`](MODERATION.md).
- Information/emergency page: explicit non-emergency-service disclaimer, verified contacts only,
  source + last-verified date on every contact, "Por verificar" when unconfirmed.

## Success metric (pilot)

At least 80% of test users should be able to: (1) submit a complete report, (2) in under three
minutes, (3) correctly explain the report's current status without assistance. Full evaluation
plan: [`EVALUATION.md`](EVALUATION.md).

## Non-goals (for this MVP)

- No real external forwarding to any government/agency system.
- No authentication system beyond what a later phase explicitly needs.
- No paid APIs, no real secrets, no real government data without an approved, checkable source.
- No public reporter identity, ranking, or popularity mechanic of any kind.
