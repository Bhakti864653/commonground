# Demo cheat sheet

Site: https://commonground-psi.vercel.app
Example cases only: SV-2026-0001 to 0008.
Never open SV-2026-0011 or SV-2026-0012.

## Before you start
- Go to /admin. Sign in with Google.
- Click "Pipeline".
- Click "Start demo (resets the example cases)".
- The guide opens at step 1 (bottom right,
  or bottom of the screen on a phone).
- In the guide: "Take me there", "Next",
  "Back", "Hide", "Exit guide".

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

3. The pipeline
   URL: /admin/pipeline
   Point at "Cases by stage" and
   "Sending: OFF (demo mode)".
   Say: "Four agent steps. Agents only
   propose; a person approves every step;
   nothing is ever sent."

4. Routing
   URL: /admin/cases/SV-2026-0007
   In "Routing Agent suggests": office,
   priority, confidence 52%, reason,
   "The agent isn't sure", Critic's concern.
   Pick an office. Click "Approve routing"
   (or "Approve with my changes").
   Wait about 10 seconds.
   Say: "When two offices fit, it asks a
   human instead of guessing."

5. Referral → outbox
   URL: /admin/cases/SV-2026-0007
   In "Referral Agent drafted a message…":
   change one word.
   Click "Approve → outbox (not sent)".
   Open the item under "Outbox for this case":
   "Ready to send – demo mode (not sent)".
   Say: "Code adds the facts. The outbox is
   a dry run: there's no sending code."

6. Duplicate
   URL: /admin/cases/SV-2026-0002
   Show "Possible duplicates nearby" and
   "Merge into SV-2026-0001". Don't click.
   Say: "Two neighbors reported the same
   streetlight."

7. Follow-up
   URL: /admin/pipeline
   Click "Run follow-up now
   (example cases only)". Wait up to 1 min.
   Show "Flagged 1 overdue case
   (SV-2026-0001)".
   Say: "This runs every morning by itself."

8. Agent timeline
   URL: /admin/cases/SV-2026-0001
   Show the follow-up card.
   Open "Agent timeline / audit log".
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
    Click "Publish on the case page"
    (check the 7 translations).
    Click "Confirm and close the case".
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
    - 672 automated tests, including ones
      that block the network.
    - After my flyers, two real residents
      sent reports.
    - Next: show it to the Alcaldía, get real
      office contacts and a privacy review,
      then switch the portal on.

## After the demo
- Pipeline → "Start demo" again
  (or "Reset demo") to reset the examples.
