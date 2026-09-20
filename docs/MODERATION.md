# CommonGround — Moderation (Local Prototype)

The admin page (`src/app/admin/`, Phase 5) is explicitly labeled as a prototype everywhere it
appears. It does not forward anything externally, and never claims a government institution
received a submission.

## What a moderator can do

- View incoming reports and proposals.
- Mark likely duplicates.
- Change status (`ReportStatus`, see [`ARCHITECTURE.md`](ARCHITECTURE.md)).
- Add private internal notes (`AdminNote`) — never shown to public users.
- Mark information verified or unverified (`VerificationState`).
- Add approved sources (`SourceConfig`, tied to the owning `CommunityConfig`).
- Remove inappropriate content.
- View moderation history.

## Rules

- Private notes are a distinct type from the public case object (`AdminNote` vs. `Report` /
  `Proposal`) — there is no code path that serializes both into the same public response.
- No external forwarding is implemented in this phase.
- No moderator action may claim a government institution "received" or "acted on" a case unless
  backed by an approved source or an authorized moderator update recorded as a
  `ModerationAction`.
- Every moderation action (`ModerationAction`: actor, action type, timestamp, detail) is
  recorded and visible in the case's moderation history, so "who changed this and when" is
  always answerable in the local prototype.

## Access

Admin routes are protected as much as this local-prototype architecture reasonably allows for a
single-operator app (matching the pattern used on Concord's `ADMIN_EMAIL`-gated admin actions) —
a real multi-moderator role system is out of scope for this MVP.
