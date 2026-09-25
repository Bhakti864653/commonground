# CommonGround — Moderation (Local Prototype)

The admin area (`src/app/admin/`) is explicitly labeled as a prototype everywhere it
appears. It does not forward anything externally, and never claims a government institution
received a submission.

## What a moderator can do

- View incoming reports and proposals, and rule-based duplicate clusters.
- Mark likely duplicates.
- Change status (`ReportStatus`, see [`ARCHITECTURE.md`](ARCHITECTURE.md)).
- Add private internal notes (`AdminNote`) — never shown to public users.
- Change a case's verification state (`VerificationState`). Marking a case officially verified
  requires a real source (title plus an http/https URL), which is then shown on the public case.
- Review residents' "this is inaccurate" flags.
- Run AI case analysis (duplicate, status, and verification specialists plus a critique pass) and
  approve or reject each suggestion — nothing changes until a moderator approves.
- Generate an on-demand community briefing (there is no scheduled or background job).
- Set up a prototype community at `/admin/communities` (temporary — see
  [`ARCHITECTURE.md`](ARCHITECTURE.md#communities-created-at-runtime-prototype)).
- View each case's moderation history.

Not implemented: adding a community's trusted sources or official contacts, and removing
content. The schema reserves `add_source` and `remove_content` action types for them, but there
is no action or UI yet.

## Rules

- Private notes are a distinct type from the public case object (`AdminNote` vs. `Report` /
  `Proposal`) — there is no code path that serializes both into the same public response.
- No external forwarding is implemented.
- No moderator action may claim a government institution "received" or "acted on" a case unless
  backed by an approved source or an authorized moderator update recorded as a
  `ModerationAction`.
- Every status change, duplicate mark, verification change, and note is recorded as a
  `ModerationAction` (actor, action type, timestamp, detail) and visible in the case's moderation
  history, so "who changed this and when" is always answerable in the local prototype. Reviewing
  an inaccuracy flag marks that flag reviewed with a timestamp.
- Moderation data lives in the same in-memory prototype storage as cases, so it is lost on a
  restart or redeploy until a database is added.

## Access

Admin routes are protected as much as this local-prototype architecture reasonably allows for a
single-operator app (matching the pattern used on Concord's `ADMIN_EMAIL`-gated admin actions) —
a real multi-moderator role system is out of scope for this MVP.
