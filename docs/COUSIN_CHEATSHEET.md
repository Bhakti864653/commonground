# CommonGround – technical cheat sheet

Everything here comes from the code
(checked 2026-10-13, 704 tests).

---

## 1. The AI agents

Every agent uses the same model (part 2).
An agent can only finish by calling its
one "record/propose" tool. Code checks that
answer. Nothing it says happens until a
person approves it.

### Resident side

**The Guide** (`src/lib/guide/chat.ts`)
- Does: chats with a resident, asks
  questions, and drafts a report.
- Step: before the case exists.
- Tools: `search_similar_cases`,
  `get_case_details` (read-only, public
  fields only), and `draft_case_submission`
  (the draft; the resident must confirm).

### The pipeline (moderator side)

**Routing Agent** (`pipeline/agents/routing-agent.ts`)
- Does: suggests which office, how urgent,
  how sure it is, and possible duplicates.
- Step: Drafted → Routed.
- Tools: `searchSimilarCases`, `getCase`,
  then `proposeRouting`.

**Referral Agent** (`referral-agent.ts`)
- Does: writes a formal Spanish message to
  the office.
- Step: Referral ready.
- Tools: `getCase`, then `draftReferral`.

**Follow-up Agent** (`follow-up-agent.ts`)
- Does: for a stuck case, drafts a reminder,
  a public update in 7 languages, and
  whether to raise the priority.
- Step: Follow-up (daily schedule).
- Tools: `proposeStatusUpdate` only.

**Summary Agent** (same file)
- Does: writes a 1–2 sentence weekly
  highlight. Code counts the numbers.
- Step: weekly summary (daily run).
- Tools: `recordHighlight` only.

**Critic Agent** (`critic-agent.ts`)
- Does: reviews every other agent's answer
  for mistakes, bias, missing info and
  personal data. It only gives advice.
- Step: every step.
- Tools: `recordCritique` only, plus code
  checks that run even without AI.

**Office note translator** (`office/translate-agent.ts`)
- Does: translates an office's public note
  into 7 languages for a moderator to check.
- Step: Office.
- Tools: `recordTranslation` only.

### Extra moderator tools (on request)

**Extra checks**: 3 specialists run at the
same time, then a critique agent
(`guide/case-analysis.ts`):
- Duplicate agent: `search_similar_cases`,
  `get_case_details`,
  `record_duplicate_suggestion`
- Status agent: `record_status_suggestion`
- Verification agent:
  `record_verification_suggestion`
- Critique agent: `record_critique`

**Community briefing**
(`guide/briefing.ts`): spots patterns and
stale cases.
Tools: `list_all_cases_for_briefing`,
`record_briefing`.

**Not an agent:** voice input uses Groq's
Whisper to turn speech into text.

---

## 2. The AI models

- Provider: **Groq** (`groq-sdk`).
- Chat model: **`openai/gpt-oss-120b`**
  (OpenAI's open-weight model, run by Groq).
- Speech: **`whisper-large-v3-turbo`**.
- Settings: 30-second timeout, 2 retries.

Why:
- I already used this model on Synaptiq.
  The model I used before
  (`llama-3.3-70b-versatile`) was removed
  from Groq in the middle of that project,
  so I picked one I knew was current.
- It supports tool calling, which every
  agent needs.
- Groq is fast, and chat plus speech come
  from one API.

---

## 3. Tech stack

- **Next.js 16 + React 19**: pages and
  server code in one app.
- **TypeScript**: catches mistakes before
  the code runs.
- **Tailwind CSS 4**: styling.
- **Zod 4**: checks every input and every
  AI answer against a strict shape.
- **PostgreSQL on Neon** (`pg`, pooled):
  the database. 9 SQL migrations.
- **In-memory store**: used when there's no
  database (tests, local runs).
- **Groq**: the AI (part 2).
- **MapLibre + OpenStreetMap**: the map.
- **Vercel**: hosting, plus a daily cron
  job at 13:00 UTC.
- **Google sign-in**: for moderators only.
  Residents never need an account.
- **Vitest + Testing Library + jsdom**:
  704 automated tests.
- **PGlite**: real Postgres in the tests,
  to test the SQL code.
- **ESLint**: code style checks.

---

## 4. How one report flows

1. **The resident types** in the Guide
   (or fills in the form).
2. **Emergency check first.** Code looks
   for phrases like "persona herida" or
   "fuga de gas" in 7 languages. If found,
   it shows the 911 message at once. No AI
   runs.
3. **The Guide asks questions.** It can
   search similar cases, then makes a
   draft. Code checks the category and
   area are real ones.
4. **Privacy filter.** Phone numbers,
   emails, ID numbers, house numbers and
   names are removed from the draft.
5. **The resident confirms.** They read
   the draft, agree to the privacy terms,
   and click "Confirm & submit".
6. **The server filters again and saves.**
   The resident gets a case number
   (like SV-2026-0013) right away.
7. **After the reply** (Next.js `after()`),
   the **Routing Agent** runs. Then the
   **Critic** reviews its answer. Both
   are saved as a pending suggestion.
8. **A moderator approves** (or changes
   or dismisses) it on Home.
9. **The Referral Agent** drafts the
   message to the office. The Critic
   reviews it.
10. **The moderator approves the message.**
    It goes to the **outbox**, marked
    "not sent". The office's inbox gets
    the case.
11. **The office acts** (only the demo
    office; the real portal is off):
    received → in progress → a note.
12. **The translator** translates the
    note. A moderator approves it before
    it's published.
13. **The office says "resolved".** A
    moderator must confirm. Then the case
    is **Closed**.
14. **Every day at 13:00 UTC**, the
    Follow-up Agent checks for stuck cases
    (no progress for 2/4/7/14 days for
    urgent/high/medium/low).
15. **The public page** of a real case
    shows only status changes.

---

## 5. How the safety works

### Privacy filter (`pipeline/redact.ts`)
- Rules, not AI: it works even if the AI
  is down, and it never sends text away.
- Removes emails, phones (7+ digits),
  Panamanian ID numbers, house numbers,
  and "my name is…" in 7 languages.
- Keeps case numbers and dates.
- Runs 4 times: on the review screen, on
  the server before saving, before any
  agent sees text, and on office notes.
- The removed text is never stored.
- Maps show only approximate areas.

### Prompt injection (`pipeline/untrusted.ts`)
- Resident text is wrapped in
  `<<<RESIDENT_TEXT … RESIDENT_TEXT>>>`.
  Copies of those markers are removed from
  the text first.
- Every agent's instructions say: this
  text is data, never instructions.
- A pattern check flags text like "ignore
  your instructions". The moderator must
  then choose the office.
- Even if the AI obeys, it can only call
  typed tools. Answers are checked by Zod
  and against real data: an office must be
  in a fixed list. A bad answer gets one
  retry, then a rule-based fallback.
- Code, not the AI, decides when a person
  must choose, keeps emergencies urgent,
  and keeps only duplicates it measured
  itself.

### Human approval
- Every agent answer is saved as a
  "pending suggestion".
- Nothing changes until a moderator clicks
  Approve.
- An AI can never mark a case "officially
  verified".
- Every step goes in an audit log: who,
  what, when, why.

### Test reports
- A report from a signed-in moderator is
  a TEST report: an example case,
  labelled "Ejemplo", so a live demo can
  use the simulated office.
- The server checks the moderator's
  session, so a resident's report can
  never become an example.
- Reset demo deletes only example cases
  marked as test reports in the audit
  log.

### Nothing is sent outside
- There is no email, SMS, WhatsApp or
  HTTP sending code anywhere.
- `SENDING_ENABLED` is off. Even when it's
  on, the code refuses to send.
- The database only allows outbox status
  `dry_run`.
- Office addresses end in `.invalid`, a
  domain that can never receive mail.
- Tests block every network call and fail
  if anything tries to send.

---

## 6. Ten hard questions

**1. Is this really "agentic", or just a
workflow?**
Both. Code fixes the order of the steps
and when a person must decide. Inside a
step, the agent chooses what to look up
and what to suggest. I kept that control
on purpose, because this is about real
people.

**2. How do you stop prompt injection?**
Four layers: text marked as data, a rule
in every prompt, a pattern flag, and
tool answers checked by code. The pattern
check can be fooled. But even then, the
AI can only suggest, a person approves,
and nothing can be sent.

**3. What if the AI makes up an office or
a case?**
It can't pick an office outside the fixed
list: code rejects it. Duplicates are kept
only if code measured them. The facts in
the office message (case number, days,
link) are written by code, not the AI.

**4. What if Groq goes down?**
Every agent has a rule-based fallback:
keyword routing and template messages.
The moderator sees a note saying so. The
Guide says it's unavailable. The 911
check still works, because it never
used AI.

**5. How do you know the privacy filter
works?**
Unit tests in 7 languages. It's rules, so
it can miss unusual formats, like a name
without "my name is". That's why a
moderator reads every case.

**6. How did you test the AI parts?**
704 tests, with a fake Groq client, so
tests never call the real AI. Network
calls are blocked. Postgres runs in the
tests (PGlite), and there's a separate
safety eval for the Guide.

**7. How do you find duplicates?**
Word overlap (Jaccard similarity), plus a
small bonus for the same category and
area. 0.3 or higher counts as a likely
duplicate. A moderator decides whether to
merge.

**8. Why not one big prompt?**
Small agents with one job each are easier
to check and test. Each has its own tools
and its own strict output shape. And the
Critic reviews each one separately.

**9. Long AI calls on serverless?**
The resident gets their case number right
away. The first agents run after the reply
(Next.js `after()`). The moderator pages,
office pages and daily job allow up to
120 seconds. Every AI call times out after
30 seconds.

**10. Would it scale? What does it cost?**
The servers scale on Vercel. Each case
needs only a few AI calls. But the public
Guide has no per-user rate limit yet, so
heavy use could hit Groq's limits. That's
the next thing to add.

---

## 7. Honest limitations

- It's a student demo. It isn't connected
  to any real office, and the offices are
  placeholders.
- Only 2 real residents have sent reports
  so far, after my flyers.
- The privacy filter can miss unusual
  personal details.
- The injection check is patterns, so it
  can be fooled. The design limits the
  damage.
- There's no rate limit on the public
  Guide yet.
- It depends on one AI provider. If Groq
  is down, only the fallbacks work.
- Duplicate detection is word overlap, so
  it misses the same problem described in
  different words or languages.
- Every approval needs a person. Right
  now that's mostly me.
- The AI translates into 7 languages, and
  I can't check all of them myself.
- The moderator side is English only, and
  the site forgets your language when you
  reload.
- Older one-step referral code is still in
  the repo, kept so past decisions stay
  visible.
