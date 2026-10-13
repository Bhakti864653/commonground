# Demo cheat sheet

Site: https://commonground-psi.vercel.app
Example cases only: SV-2026-0001 to 0008.
Never open SV-2026-0011 or SV-2026-0012.

## Before you start
- Go to /admin. Sign in with Google.
  You land on Home.
- Menu: Home · All cases · Demo office ·
  Settings. Every other screen has
  "← Back to Pipeline".
- On Home, in "Demo tools", click
  "Start demo (resets the example cases)".
- The guide opens at step 1 (bottom right,
  or bottom of the screen on a phone).
- In the guide: "Take me there", "Next",
  "Back", "Hide", "Exit guide".

## How a case page works
- Step bar: Drafted → Routed →
  Referral ready → Office → Follow-up.
- One big "Next action" button: it jumps
  to what needs you.
- Each agent card: Suggests, Why,
  Second check, then
  Approve · Change · Dismiss.
- Everything else is folded in
  "More tools".

## Side 1 – The resident

1. The Guide asks and removes the phone
   URL: /guide
   Click: chat box "Escribe tu pregunta…"
   Type: Hay basura en la calle,
         mi teléfono es 6123-4567.
   Press "Enviar". Answer its questions.
   Ask it to prepare the report.
   Show the draft: title, urgency,
   no phone number.
   Click "Descartar borrador". Don't submit.
   Say: "A resident just talks. The AI asks
   only what it needs and removes personal
   details before anything is saved."

2. Emergency
   URL: /guide
   Type: Hay un cable caído y una
         persona herida.
   Show the instant 911 message.
   Say: "Emergencies are caught by rules
   before any AI runs."

## Side 2 – The agents and the moderator

3. Home
   URL: /admin/pipeline
   Point at "What needs your attention"
   (each line has a Review button),
   then "Cases by step", then
   "Sending: OFF (demo mode)".
   Say: "Agents only suggest; I approve
   every step; nothing is ever sent."

4. Routing
   URL: /admin/cases/SV-2026-0007
   Step bar is at "Drafted". Next action:
   "Review the routing suggestion".
   In the "Routing Agent" card: Suggests
   (office, priority, 52%), Why,
   "The agent isn't sure", Second check.
   The choices are already open: pick an
   office. Click "Approve with my changes".
   Wait about 10 seconds.
   Say: "When two offices fit, it asks a
   human instead of guessing."

5. Referral → outbox
   URL: /admin/cases/SV-2026-0007
   Next action: "Review the message to
   the office". In the "Referral Agent"
   card, click "Change", change one word,
   click "Approve with my changes".
   Open the item under "Outbox for this
   case": "Ready to send – demo mode
   (not sent)". Step bar: "Office".
   Say: "Code adds the facts. The outbox is
   a dry run: there's no sending code."

6. Duplicate
   URL: /admin/cases/SV-2026-0002
   In the Routing Agent card, show
   "Possible duplicate" and
   "Merge into SV-2026-0001". Don't click.
   Say: "Two neighbors reported the same
   streetlight."

7. Follow-up
   URL: /admin/pipeline
   In "Demo tools", click "Run follow-up
   now (example cases only)".
   Wait up to 1 min.
   Show "Flagged 1 overdue case
   (SV-2026-0001)", then the new line in
   "What needs your attention".
   Say: "This runs every morning by itself."

8. History
   URL: /admin/cases/SV-2026-0001
   Step bar is at "Follow-up". Show the
   "Follow-up Agent" card (don't approve).
   Open "History: everything agents and
   people did".
   Say: "Every step is logged: who, what,
   when, why, and what a person approved."

## Side 3 – The office

9. The inbox
   URL: /demo/office?office=lighting
   Point at the red "Simulated office"
   banner. Show SV-2026-0001 ("New").
   Say: "This is the other side. The real
   portal is built but switched off."

10. The office acts
    URL: /demo/office?office=lighting
    On SV-2026-0001: "Mark received",
    then "Mark in progress".
    Keep "Public note". Type:
    Cambiaremos la luminaria esta semana.
    Click "Add note". Wait ~10 s.
    Say: "An office sees only its own cases."

11. Resolved, then a person confirms
    First, in the Demo office:
    "Mark resolved" on SV-2026-0001.
    Then URL: /admin/cases/SV-2026-0001
    Next action: "Confirm the office's fix".
    In the note card, check the 7
    translations, click "Approve and
    publish". Then click "Approve and
    close the case". Step bar: "Closed".
    Say: "An office can say it's fixed, but a
    person confirms before it closes."

## Back to the resident

12. The resident sees it
    URL: /cases/SV-2026-0001
    Scroll the timeline: received,
    in progress, the note, resolved, Closed.
    Say: "Report → agents → office → back
    to the resident."

## The end

13. Closing lines
    - The office portal is built but
      switched off until the mayor's
      office agrees.
    - Agents only propose. A person
      approves every step. No sending code.
      Personal details are removed.
      Real cases show only statuses.
    - 692 automated tests, including ones
      that block the network.
    - After my flyers, two real residents
      sent reports.
    - Next: show it to the Alcaldía, get real
      office contacts and a privacy review,
      then switch the portal on.

## After the demo
- Home → "Demo tools" → "Reset demo"
  (or "Start demo" again) to reset the
  examples.
