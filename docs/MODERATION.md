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
- Review visitor-started ("starter") communities at `/admin/communities` and mark one reviewed,
  which turns it into a normal pilot and removes its "not reviewed" notice. Until then every page
  of a starter community tells residents that no local moderator reviews its reports.
- Set up a prototype community at `/admin/communities` (temporary — see
  [`ARCHITECTURE.md`](ARCHITECTURE.md#communities-created-at-runtime-prototype)).
- View each case's moderation history.

- Remove a case's content when it breaks the community guidelines (personal information, public
  accusations or harassment, spam, off-topic, other). The description and photo disappear from
  every public page, the activity feed, search, and the Guide's tools; the case number, the
  public reason, and the date stay visible so the removal itself is transparent. Nothing is
  deleted, and a moderator can restore it. Both are recorded (`remove_content` /
  `restore_content`), with an optional private note that only appears in the moderation history.
- Add or remove a community's approved sources and official contacts at `/admin/sources`. Every
  URL must be http/https; a contact can only be marked verified with a source URL and the date it
  was checked (otherwise it shows publicly as unverified). Entries that are unverified or were
  checked more than 180 days ago are listed first under "Needs review", and a two-step "Mark
  re-checked today" action is the only way to move a check date forward. Changes, including
  re-checks, are listed in a change history on that page. Like everything else in the prototype store, runtime changes are lost on
  a restart or redeploy; the built-in entries always come back.

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
