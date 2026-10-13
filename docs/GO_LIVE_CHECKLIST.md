# Go-live checklist: the office portal

The office portal is **built but switched off** (`OFFICE_PORTAL_ENABLED` is not set, which means
off). While it is off, no office can sign in, `/office` only says "not enabled", every office
action refuses on the server, and nothing is sent anywhere. Moderators can show how it works at
`/demo/office` with a simulated example office and example cases only.

Do **not** turn it on until every box below is checked.

## 1. Agreement

- [ ] A written agreement with the Alcaldía de Santiago (or the relevant authority) that its
      offices will receive and answer CommonGround referrals through this portal.
- [ ] The agreement names who is responsible for answering, and how fast they aim to respond.
- [ ] It states clearly that CommonGround is an independent community project, not a government
      service, and that residents' reports are community reports, not official complaints.
- [ ] Data-sharing terms: offices see only public case information (case number, category,
      approximate zone, description, priority, days open, number of residents). They never see
      residents' identities (CommonGround doesn't collect them), moderator notes, or AI drafts.
- [ ] The "Demo – independent student project" banner and the student-demo wording are reviewed:
      decide with the authority what replaces them.

## 2. Real offices and contacts

- [ ] Replace the placeholder offices in `src/data/referral-offices.ts` with the real departments
      agreed above. Each needs a name, what it handles, and its categories.
- [ ] Every contact is verified from a primary source (an official website or letter) and the
      source is recorded — no invented or guessed contacts.
- [ ] Update the Routing Agent's office list and run its tests; review a sample of routings by hand.
- [ ] Decide what happens to the example offices and example cases (keep the demo, or remove it).

## 3. Accounts

- [ ] For each office, the authority names the people who will use the portal (work Google
      accounts, not personal ones).
- [ ] The owner invites each one at `/admin/offices` (invite-only; there is no sign-up). Each
      account belongs to exactly one office.
- [ ] Add the office sign-in callback to the Google OAuth client's allowed redirect URIs:
      `https://<your domain>/api/auth/office/google/callback`.
- [ ] Agree how accounts are removed when someone changes job ("Disable" ends their sessions).

## 4. Privacy and safety review

- [ ] Someone other than the developer reviews `docs/PRIVACY.md`, `docs/AGENTIC_PIPELINE.md` and
      this checklist.
- [ ] Re-check that office screens only receive `OfficeReferralView` (see
      `src/lib/office/__tests__/office.test.ts`, "sends offices only public-safe fields").
- [ ] Re-check the isolation tests (an office only sees its own referrals; never example cases;
      never moderator-only data) and the switch tests (`flag.test.ts`).
- [ ] Decide the retention period for office notes and audit logs, and publish it in the
      privacy page.
- [ ] Update `/privacy` and `/terms` (all seven languages) to say that cases are shared with the
      named offices.
- [ ] Emergency wording stays: CommonGround is never an emergency channel; offices are told to
      treat nothing in the portal as an emergency call.

## 5. Flip it on

1. Take a backup: `node --env-file=.env.local scripts/db-backup.mjs backup`, then `verify` it.
2. In Vercel → Project → Settings → Environment Variables (Production), add
   `OFFICE_PORTAL_ENABLED` = `true`.
3. Redeploy. Check `/admin/offices` says the portal is **ON**.
4. Sign in at `/office` with one invited test account; confirm it sees only its own referrals,
   and that a moderator approving a referral makes it appear there.
5. Tell the offices the address (`https://<your domain>/office`).

Note: this does **not** turn on email or any external sending. `SENDING_ENABLED` is separate, and
CommonGround still has no external delivery channel. The portal itself is how offices receive
referrals.

## Turning it off again

Remove `OFFICE_PORTAL_ENABLED` (or set it to `false`) in Vercel and redeploy. Every office
session stops working immediately; their data stays in the database.

To remove the office side completely: deploy a version from before it, then
`node --env-file=.env.local scripts/db-backup.mjs rollback-0008`
(`db/rollback/0008_office_portal_down.sql`).
