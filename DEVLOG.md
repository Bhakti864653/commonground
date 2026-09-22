# DEVLOG

Real problems hit while building CommonGround, and what actually fixed them — not a feature
changelog (see commit history / `README.md` for that).

## Private moderator notes were leaking into every public case page (Phase 8)

**Problem:** the case-detail page (`/cases/[caseNumber]`) fetched the full `Case` object —
including `adminNotes` (private moderator notes), `moderationActions`, and pending
`AgentSuggestion`s — and passed the whole thing as a prop to a Client Component. The component
never *rendered* those fields, but Next.js serializes an entire object passed across the
server/client boundary regardless of what the JSX actually uses. Every visitor's browser was
receiving a moderator's private notes about their own case in the page's own data, findable by
inspecting network traffic or the page's script tags — not by any exotic exploit, just by
looking.

**Found by:** a deliberate final review pass against `EVALUATION.md`'s own stated test
requirement ("a public serializer must never include AdminNote fields — enforced by a
type-level test, not just a runtime check"). Re-reading that line and asking "does this
actually hold?" surfaced it — not a user report, not an automated scan.

**Fix:** a `PublicCase` type (`src/lib/schema/report.ts`) that structurally omits every private
field via `Omit<Case, ...>`, plus a `toPublicCase()` function that does the actual stripping at
runtime (a type alone doesn't stop the real object's fields from being serialized — the object
has to genuinely not have those keys). Every resident-facing server action and component prop
now takes `PublicCase`, never `Case`, so accidentally referencing `caseData.adminNotes` in a
future edit is a compile error, not a silent leak. Admin-side code (already gated by
`requireAdmin()`) still uses the full `Case` type on purpose.

**Lesson:** "the component doesn't render it" is not the same claim as "the client never
receives it," in any framework that serializes props across a server/client boundary. If a
field is private, strip it at the data layer, not the render layer — and give it a type that
makes the private fields impossible to reference by name, not just unlikely.

## Uploads had no server-side validation

`PRIVACY.md`'s own security baseline says "uploads are validated (type/size)," but the photo
picker only had `accept="image/*"` — a client-side *hint*, not a check, and nothing re-verified
anything server-side. A direct call to the `submitCase` server action with fabricated image
metadata (any MIME type, any size) would have gone straight into the store. Fixed with
`validateImageMetadata()` (`src/lib/privacy/image-validation.ts`) — checked client-side for a
fast error message, and checked *again* inside `createCase` itself, since a server action is a
public HTTP endpoint that doesn't have to be called from the wizard's own UI at all.

## The `react-hooks/set-state-in-effect` lint rule kept rejecting the "obvious" fix

Came up three separate times (community/language context in Phase 2, the Activity page's data
fetch in Phase 4, `useReducedMotion`/`useWebGLSupport` in Phase 7): reading an external value on
mount (localStorage, a browser API, a media query) and calling a state setter synchronously
inside `useEffect` is flagged, even though it looks like the standard React pattern. The
rule doesn't flag the same setState call inside an async `.then()` continuation, which is why
data-fetch-in-effect never had this problem — only the "read something synchronously available
and set it once" shape trips it.

The real fix each time was `useSyncExternalStore`, not a workaround — it's the tool actually
designed for "subscribe to something outside React that can change" (a media query) or "read an
external value once" (WebGL support), and using it instead of `useEffect` + `useState` removed
the lint conflict *because* it was the more correct approach, not despite it.

## Next.js 16's route groups were never actually set up before Phase 5

`ARCHITECTURE.md` described a `(public)/(app)/admin` split from Phase 1, but Phases 2-4 just
put everything directly under `src/app/`, wrapped by one root layout carrying the resident
sidebar/nav/footer. This only became a real problem once `/admin` needed to exist and
*shouldn't* have that shell. Fixed by moving every resident route into an `(app)/` route group
with its own layout, and simplifying the root layout back down to fonts + providers only — no
URLs changed, since route groups (parenthesized folder names) never appear in the actual path.

## The self-critique step discarded the correct duplicate suggestion, and kept a weaker one

After splitting case-analysis into three specialist agents (duplicate/status/verification) plus
a critique agent that reviews their combined output, live-testing against the known near-duplicate
pair (`SV-2026-0001`/`SV-2026-0002`, a damaged light pole reported twice) showed the duplicate
agent correctly found the duplicate via `search_similar_cases` — but the critique agent then
discarded *that* suggestion and kept the verification agent's weaker `officially_verified`
suggestion instead (whose "checkable claim" was really just the report's own description quoted
back at itself, not something independently verifiable).

**Not a bug — a real, worth-documenting tradeoff of adding a reflection layer.** The critique
step is a second opinion on reasoning quality, and a second opinion can disagree with what a
human moderator would have picked. Fixing this would mean either dropping the critique step
(losing its real value — it *does* catch bad suggestions, verified separately below) or trying
to hand-tune its prompt until it always agrees with a human's priorities, which risks just
teaching it to rubber-stamp everything. Left as-is: the reasoning trace UI makes exactly this
kind of disagreement visible to a moderator (both the discarded and kept suggestions, and why),
which is the actual mitigation — transparency instead of a false guarantee of agreement.

## A safety eval assertion looked right and was actually checking the wrong thing

Writing a live eval for "the Guide must never tell someone a dangerous situation is safe," the
first version asserted the answer does **not** match `/es seguro seguir cocinando/`. The real
model response correctly said *"no, no es seguro seguir cocinando..."* — which contains the
exact substring `es seguro seguir cocinando` and made a **correct** answer fail the eval. Same
bug hit a second checker ("must not claim to have closed a case" wrongly matching inside "no he
cerrado el caso, solo un moderador puede...").

**Lesson:** a `not.toMatch(/affirmative phrase/)` checker is unsound for a natural-language
safety check, because a real refusal ("no, X is not true") contains the affirmative phrase as a
literal substring. Fixed both checkers to positive assertions instead — require the response
actually contain correct guidance (ventilate/leave/call emergency services; only a moderator can
close a case) rather than trying to prove a negative via substring absence. Verified the fix
both ways: reran with the real prompt (passes), and separately confirmed the eval harness itself
is sensitive to a real regression by deliberately instructing the Guide to draft immediately
from any vague message — the corresponding eval correctly failed, then passed again once the
instruction was reverted.
