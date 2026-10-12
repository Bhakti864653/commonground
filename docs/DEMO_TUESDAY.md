# CommonGround demo – Tuesday

Live site: https://commonground-psi.vercel.app
Moderator area: /admin (sign in with Google)

## 1. One-minute explanation

CommonGround has five AI agents.
They only suggest. A human moderator approves everything.
Nothing ever leaves the system: it's a student demo.

Step 1 – Drafting.
The Guide asks short questions:
what, where, since when, how serious, is anyone in danger.
It drafts a report with a title and an urgency.
If someone mentions injury, fire or fallen wires,
it says "call 911" at once, before any AI runs.
A privacy filter removes phones, emails and names.
The resident checks the draft and confirms it.

Step 2 – Routing.
The Routing Agent uses real tool calls.
It searches similar cases, then proposes an office,
a priority, a confidence score and possible duplicates.
If it isn't sure, it asks the moderator to decide.

Step 3 – Sending (dry run).
The Referral Agent writes a formal message in Spanish.
Code adds the exact facts: case number, days open,
how many residents reported it, and the public link.
When approved, it goes to an outbox marked
"Ready to send – demo mode (not sent)".
The sending flag is off, and there is no sending code.
A test blocks the network to prove nothing goes out.

Step 4 – Follow-up.
A daily scheduled job finds cases that stopped moving.
It drafts a reminder, a public update in 7 languages,
and a suggestion to raise the priority.
It also drafts a weekly community summary.

A Critic Agent checks every output first.
Every step is saved in an audit log.
If the AI gives bad output, it retries once,
then falls back to simple rules and says so.

## 2. Demo script (example cases only)

Example cases are SV-2026-0001 to SV-2026-0008.
Do not click anything on SV-2026-0011 or SV-2026-0012.
Those are real residents' reports.

Before the demo:
1. Go to /admin and sign in with Google.
2. Click "Pipeline" at the top.
3. Click "Reset demo", then "Yes, reset the 8 example cases".
   This puts the example cases back to the start.

Part A – the resident side (about 2 minutes)
4. Open the site and go to "The Guide".
5. Type: "Hay basura en la calle, mi teléfono es 6123-4567."
6. Answer its short questions (area, since when).
7. Ask it to prepare the report.
8. Show the draft: title, urgency, phone number removed.
9. Do NOT press submit. Click to discard the draft.
   (Submitting would create a new real case.)
10. Type: "Hay un cable eléctrico caído y una persona herida."
11. Show the instant message: "call 911 right now".

Part B – the public case page (about 1 minute)
12. Open /cases/SV-2026-0006.
13. Show the timeline:
    "Referral prepared – sending is paused in this demo"
    and the moderator's follow-up update.
14. Point out: no office name is shown publicly.

Part C – the moderator side (about 5 minutes)
15. Go to /admin/pipeline.
16. Show "Cases by stage" (all 5 stages have examples),
    the outbox, and "Waiting for a moderator".
17. Open SV-2026-0007 (the solar lamps proposal).
18. Show: confidence 52%, "the agent isn't sure",
    lighting or parks, and the Critic agrees.
19. Pick an office, then click "Approve routing".
20. Wait about 10 seconds: the Referral Agent drafts live.
21. Edit one word in the message.
22. Click "Approve → outbox (not sent)".
23. Open the outbox item: show the placeholder address
    and "Ready to send – demo mode (not sent)".
24. Open SV-2026-0002: show "Possible duplicates nearby"
    and the "Merge into SV-2026-0001" button.
25. Open SV-2026-0003: show the waiting follow-up card
    (reminder, public update, escalate to urgent).
26. Go back to Pipeline. Click "Run follow-up now".
27. Wait up to a minute. It flags SV-2026-0001.
28. Open SV-2026-0001, approve the follow-up.
29. Open /cases/SV-2026-0001 to show the new public update.
30. On any case, open "Agent timeline / audit log".

After the demo:
31. Go to Pipeline and click "Reset demo" again.

## 3. Honest limitations

- Nothing is ever sent. That's on purpose,
  but it means no real office has seen any of this.
- The offices are placeholders, not real contacts.
- Tests prove injection attempts are contained.
  They can't prove the AI "understood" anything.
  The safety comes from the design:
  agents only suggest, outputs are checked,
  a human approves, and there's no sending code.
- The privacy filter uses rules, so it can miss
  an unusual name or address. Moderators read everything.
- Moderator screens are in English only.
  Everything residents see is in all 7 languages.
- One follow-up run handles at most 6 cases
  (Groq free tier and a 2-minute time limit).
- AI wording changes from run to run.
  Once, a reminder had no greeting.
- "Run follow-up now" also routes older real cases
  that were never routed. That stays private,
  but their case numbers can appear in the result message.
- The weekly summary covers the whole community,
  including real cases. "Reset demo" doesn't reset it.
- The first scheduled run is at 8:00 Panama time.

## 4. Questions he might ask

Q: Is this real tool calling or just prompts?
A: Real. The model calls typed tools like
   searchSimilarCases and getCase, sees the results,
   then must finish with one "propose" tool.
   Its arguments are checked with Zod schemas.

Q: How do you stop prompt injection?
A: Resident text goes inside marked blocks
   the text can't close, labelled "data, not instructions".
   Even if the model obeys, it can only suggest,
   bad values are rejected, a human approves,
   and there is no code that can send anything.

Q: What if it makes up an office or a case?
A: Offices must come from the config list.
   Duplicate case numbers must really exist.
   Anything else is rejected and retried once,
   then replaced by a rule-based answer.

Q: How do you test AI code without calling the API?
A: A fake Groq client returns scripted tool calls.
   639 tests run with no network.
   I also ran it once against the real model.

Q: What happens if Groq is down or rate-limited?
A: The SDK retries with backoff.
   If it still fails, the step falls back to rules
   and the moderator sees why. It never crashes.

Q: Why not just send real emails?
A: There's no agreement with any office.
   Sending to a government office as a student demo
   would be misleading. So the outbox is a dry run,
   and the database only allows status "dry_run".

Q: How is the daily job protected?
A: Vercel cron calls the route with a secret.
   Without it, the route returns 401.
   With no secret set, it refuses everyone.

Q: Where is the data stored?
A: Postgres on Neon, with Row Level Security on.
   Tests use the same code on an in-memory store
   and on PGlite (a real Postgres in the test).
