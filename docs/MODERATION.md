# CommonGround — Moderation (Local Prototype)

The admin area (`src/app/admin/`) is explicitly labeled as a prototype everywhere it
appears. Nothing is ever sent automatically. The only way a case reaches an office is a referral
that a moderator approves and then delivers by hand (see [Referrals](#referrals)), and the app
never claims a government institution received or acted on a submission.

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
- Approve or reject the AI-prepared referral for a case (see [Referrals](#referrals)), editing
  its Spanish message first if needed.
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
- No automatic forwarding exists. A referral reaches an office only after a moderator approves it
  and delivers it themselves; approving records that decision, it does not contact anyone.
- Referrals go only to verified, non-emergency official contacts named in the community's
  `referralRouting`, and never include personal data.
- No moderator action may claim a government institution "received" or "acted on" a case unless
  backed by an approved source or an authorized moderator update recorded as a
  `ModerationAction`.
- Every status change, duplicate mark, verification change, and note is recorded as a
  `ModerationAction` (actor, action type, timestamp, detail) and visible in the case's moderation
  history, so "who changed this and when" is always answerable in the local prototype. Reviewing
  an inaccuracy flag marks that flag reviewed with a timestamp.
- Moderation data lives in the same in-memory prototype storage as cases, so it is lost on a
  restart or redeploy until a database is added.

## Referrals

When a resident submits a case (through the wizard or a confirmed Guide draft), an AI pipeline
runs after the response (`src/lib/guide/referral/`, Groq):

1. **Classify**: checks whether the chosen category fits (it may suggest another real category)
   and estimates urgency (low/medium/high). A report matching an emergency phrase gets no
   referral at all.
2. **Route**: no AI. The office comes from the community's `referralRouting` (category →
   official contact). Every route must be verified like the contacts themselves were; only
   verified, non-emergency contacts can be targets, rechecked when the referral is drafted and
   again when it is approved. In Santiago de Veraguas every category currently routes to the
   Alcaldía's office line, the only verified non-emergency contact.
3. **Draft**: a short, formal message in Spanish addressed to that office, built only from public
   case fields (case number, category, approximate area, description). It must contain the case
   number and may not contain emails, links, or phone numbers. Names can't be detected
   automatically, which is one reason a moderator reads every message.
4. **Review**: a second model call checks the draft against the case. Its concerns are shown to
   the moderator; it can't approve anything.

The result is a pending `referral` suggestion on `/admin/cases/[caseNumber]` with the office,
urgency, the AI's notes, and an editable message.

- **Approve**: the edited message is checked again, the case moves to `referred`, the public
  timeline says a moderator approved the referral to that office, and an `approve_referral`
  action is recorded. The card then shows the office's phone or WhatsApp link and a copy button;
  the moderator delivers the message. CommonGround sends nothing.
- **Reject**: a `reject_referral` action is recorded, and the public timeline says a moderator
  decided not to send it (no reason is shown). The status doesn't change.

The public timeline shows each AI step ("AI reviewed this report", "AI prepared a referral to
{office}", "Waiting for moderator approval") with a "CommonGround AI" label. The message,
urgency, and reasoning stay private. If Groq is unavailable or a step fails, the pipeline stops,
logs the case number, step, and error status on the server, and adds no public entry for steps
that didn't happen. Like everything else, referrals live in the in-memory prototype store: on a
serverless host the moderator may be served by an instance that never saw them.

## Access

Admin routes are protected as much as this local-prototype architecture reasonably allows for a
single-operator app (matching the pattern used on Concord's `ADMIN_EMAIL`-gated admin actions) —
a real multi-moderator role system is out of scope for this MVP.
