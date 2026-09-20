# CommonGround — Design System

## Direction

Calm, warm, trustworthy, community-centered, transparent, hopeful, serious when safety matters,
usable on inexpensive phones and slow connections. CommonGround reads as a thoughtful
civic-action tool — explicitly **not** social media, a government portal, a futuristic AI demo,
a dark analytics dashboard, or a game.

Avoid: glowing AI orbs, neon futuristic effects, constant animation, excessive maps, likes/
follower counts, public popularity rankings, alarming red markers everywhere, government flags/
seals/official-looking symbols.

## Color tokens

Defined as CSS custom properties in `src/app/globals.css`:

| Token     | Hex       | Use |
|-----------|-----------|-----|
| `--ink`   | `#17212B` | Primary text |
| `--cream` | `#FAF8F3` | Backgrounds |
| `--teal`  | `#167D78` | Constructive primary actions |
| `--mint`  | `#DFF1EC` | Teal-family surface/accent |
| `--yellow`| `#F4C95D` | Pending / under-review states |
| `--coral` | `#D96555` | Urgent warnings only |
| `--blue`  | `#DCEAF3` | Informational panels |
| `--slate` | `#65727D` | Secondary text |

Color is never the only signal for meaning — every status, verification state, and urgency
indicator pairs a color with text and/or an icon (spec §6, §14: "Do not rely on color alone").

## Navigation

- **Desktop:** left sidebar — wordmark, active-community selector, Home / Activity / Reports /
  Proposals / Guide / How it works / Settings.
- **Mobile:** bottom navigation — Home / Explore / Create / Guide / More. The center "Create"
  action opens a choice: report a problem or propose a solution.
- The active community is always visible ("CommonGround — Santiago de Veraguas ▾").

## Home page

Answers, in order: what CommonGround is, which community is active, what the user can do now.
The AI assistant is never the first or most prominent element — the community purpose comes
before the technology (spec §8).

## Report/proposal flow

A guided multi-step flow with visible progress ("Paso 2 de 5"), never one large form:

1. Report a problem / propose a solution.
2. Category (labeled cards, icon + text, never icon-only).
3. Description (+ optional photo, voice-note placeholder, supporting info).
4. Approximate area (never name/phone/exact address/exact coordinates).
5. Review (edit or submit) — shows exactly what will be public vs. private, plus consent
   version.

## Dashboard

List view is the default; map and 3D are optional toggles, never the default. No likes,
followers, popularity rankings, "worst neighborhood" rankings, or outrage scores. Each card:
title, category, approximate area, date, status, source type, case number.

## Status & verification labels

Both are always shown as text + color, never color alone. Full status/verification enums and
Spanish labels live in `src/lib/schema/report.ts` (`STATUS_LABELS`, `VERIFICATION_LABELS`).

## Accessibility baseline

WCAG 2.2: semantic HTML, visible keyboard focus, proper form labels, accessible error messages,
readable contrast, comfortable touch targets, reduced-motion support, text alternatives for
maps/3D, no color-only communication, no flashing effects, no essential information hidden
inside WebGL only.

## Typography & polish

Deferred to Phase 2 (foundation) once the token set above is wired into `globals.css` and the
layout shell exists — chosen live against the actual home page rather than picked in the
abstract, matching the lesson from Synaptiq's/Concord's design-feedback history: verbal/abstract
design decisions without a concrete reference tend to require multiple rework rounds; a real
rendered page to react to converges faster.
