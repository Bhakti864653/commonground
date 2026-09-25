# CommonGround — Design System

## Direction

Calm, warm, trustworthy, community-centered, transparent, hopeful, serious when safety matters,
usable on inexpensive phones and slow connections. CommonGround reads as a thoughtful
civic-action tool — explicitly **not** social media, a government portal, a futuristic AI demo,
a dark analytics dashboard, or a game.

Avoid: glowing AI orbs, neon futuristic effects, constant animation, excessive maps, likes/
follower counts, public popularity rankings, alarming red markers everywhere, government flags/
seals/official-looking symbols.

## Visual direction: "community field notes"

A soft, open, paper-toned layout: a deep-green sidebar, generous whitespace, large Georgia
headlines with a lime highlight, an illustrative green community map, and open (unboxed) sections
rather than grids of identical cards. Light theme by default; an optional dark theme uses the
same tokens with dark values.

## Color tokens

Defined as CSS custom properties in `src/app/globals.css` (light values shown; each has a dark
counterpart). Every text pairing was checked at WCAG AA (4.5:1) or better in both themes.

| Token | Light | Use |
|-------|-------|-----|
| `--ink` | `#172B25` | Primary text |
| `--paper` / `--cream` | `#F8F8F1` | Page background (and text on dark fills) |
| `--surface` | `#FFFEF9` | Panels, inputs |
| `--slate` | `#5F6D64` | Secondary text |
| `--teal` | `#285745` | Primary actions |
| `--lime` | `#DDF19A` | Primary call-to-action, headline highlight |
| `--sidebar` | `#193B30` | Sidebar and phone bottom bar |
| `--map` | `#C9DFBB` | Community map background |
| `--pin-review` | `#E8703F` | Map pins for cases awaiting review |
| `--pin-progress` | `#5467C9` | Map pins for cases in progress |
| `--status-review` / `-progress` / `-resolved` / `-neutral` | soft tints | Status pill backgrounds |
| `--coral` | `#B04D38` | Warnings and errors only |

Color is never the only signal for meaning — every status, verification state, and urgency
indicator pairs a color with text and/or an icon (spec §6, §14: "Do not rely on color alone").

## Typography

Georgia (system serif) for headlines, with tight tracking; Inter for body text. Headlines use
size and spacing for hierarchy rather than weight. For Chinese and Hindi, tracking is reset to
normal, synthesized italics are turned off, and line height is increased, since the Latin
display settings would distort Han characters and Devanagari.

## Navigation

- **Sidebar:** Overview / Explore cases / New case / The Guide / Moderation, plus the language
  picker and theme toggle. Full width from 1100px, an icon rail (labels kept for screen readers
  and as tooltips) from 768px, hidden on phones.
- **Top bar:** "Your community / [place selector]" and a "New case" button. On smaller screens it
  also holds the language picker and theme toggle.
- **Phones:** a dark bottom bar with the same five destinations.
- The active community is always visible in the place selector.

## Home page

Answers, in order: what CommonGround is, which community is active, what the user can do now.
Layout: an intro with the one primary action ("Raise an issue or idea"), then the community map
beside open "Meet the Guide" and "Community pulse" sections, then the latest cases. The AI
assistant is never the first or most prominent element — the community purpose comes before the
technology (spec §8).

## Report/proposal flow

A guided multi-step flow with visible progress ("Paso 2 de 5"), never one large form:

1. Report a problem / propose a solution.
2. Category (labeled cards, icon + text, never icon-only).
3. Description (+ optional photo, voice-note placeholder, supporting info).
4. Approximate area (never name/phone/exact address/exact coordinates).
5. Review (edit or submit) — shows exactly what will be public vs. private, plus consent
   version.

## Community map

An illustrative 2D SVG map, never a real geographic map. Pins are real cases placed only by
approximate area; their numbers match the numbered case list. Every pin color is named in a
legend and every pin has a text label. The same cases are always available as a list, and more
pins never mean an area is worse or more dangerous.

## Explore and case lists

Cases are shown as rows in a list, not as ranked cards. Each row: a numbered category mark (the
number matches its map pin), what was observed, the case number, category, type, approximate
area, and status. Explore adds search and filters (type, status, category, area). No likes,
followers, popularity rankings, "worst neighborhood" rankings, or outrage scores.

## Status & verification labels

Both are always shown as text + color, never color alone. Full status/verification enums and
their labels in all seven languages live in `src/lib/schema/report.ts` (`STATUS_LABELS`,
`VERIFICATION_LABELS`).

## Languages

Spanish is the default for the Santiago de Veraguas pilot. The interface is also available in
English, Portuguese, French, Simplified Chinese, Hindi, and Italian, chosen from a picker that
lists each language by its own name.

## Accessibility baseline

WCAG 2.2: semantic HTML, visible keyboard focus, proper form labels, accessible error messages,
readable contrast, comfortable touch targets, reduced-motion support, text labels and a list
alternative for the map, no color-only communication, no flashing effects.
