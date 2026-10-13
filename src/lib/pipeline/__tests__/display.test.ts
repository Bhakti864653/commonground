import { describe, expect, it } from "vitest";
import { CARD_IDS, DISPLAY_STEPS, DISPLAY_STEP_LABELS, displayStepOf, nextActionFor, type NextActionInput } from "../display";
import { PIPELINE_STAGES } from "../types";

describe("the five steps moderators see", () => {
  it("are Drafted → Routed → Referral ready → Office → Follow-up", () => {
    expect(DISPLAY_STEPS.map((s) => DISPLAY_STEP_LABELS[s])).toEqual(["Drafted", "Routed", "Referral ready", "Office", "Follow-up"]);
  });

  it("map every stored stage, without changing the stages themselves", () => {
    expect(PIPELINE_STAGES).toEqual(["drafted", "routed", "reviewed", "referral_prepared", "follow_up"]);
    expect(displayStepOf("drafted", false)).toBe("drafted");
    expect(displayStepOf("routed", false)).toBe("routed");
    // A draft waiting for approval and a message in the outbox are both "Referral ready"…
    expect(displayStepOf("reviewed", false)).toBe("referral_ready");
    expect(displayStepOf("referral_prepared", false)).toBe("referral_ready");
    // …until the office's inbox has the case.
    expect(displayStepOf("referral_prepared", true)).toBe("office");
    expect(displayStepOf("follow_up", true)).toBe("follow_up");
    expect(displayStepOf("follow_up", false)).toBe("follow_up");
  });
});

describe("the one next action on a case", () => {
  const base: NextActionInput = { pendingKinds: [], hasOffice: true, canDraft: false, officeStatuses: [], closed: false, isDuplicate: false };

  it("jumps to the waiting suggestion, office decisions first", () => {
    expect(nextActionFor({ ...base, pendingKinds: ["follow_up", "office_note", "office_resolution"] })).toEqual({
      kind: "jump",
      label: "Confirm the office’s fix",
      target: CARD_IDS.office_resolution,
    });
    expect(nextActionFor({ ...base, pendingKinds: ["follow_up", "office_note"] })).toMatchObject({ label: "Check the office’s note", target: CARD_IDS.office_note });
    expect(nextActionFor({ ...base, hasOffice: false, pendingKinds: ["routing"] })).toMatchObject({ label: "Review the routing suggestion", target: CARD_IDS.routing });
    expect(nextActionFor({ ...base, pendingKinds: ["referral"] })).toMatchObject({ label: "Review the message to the office", target: CARD_IDS.referral });
    expect(nextActionFor({ ...base, pendingKinds: ["follow_up"] })).toMatchObject({ label: "Review the follow-up", target: CARD_IDS.follow_up });
  });

  it("moves the case forward when nothing is waiting", () => {
    expect(nextActionFor({ ...base, hasOffice: false })).toEqual({ kind: "route", label: "Ask the Routing Agent for an office" });
    expect(nextActionFor({ ...base, canDraft: true })).toEqual({ kind: "draft", label: "Draft the message to the office" });
  });

  it("says plainly when there is nothing to do", () => {
    expect(nextActionFor({ ...base, officeStatuses: ["in_progress"] })).toEqual({ kind: "wait", label: "Nothing to do: waiting for the office" });
    expect(nextActionFor({ ...base, closed: true, hasOffice: false })).toEqual({ kind: "wait", label: "Nothing to do: this case is closed" });
    expect(nextActionFor({ ...base, isDuplicate: true, hasOffice: false })).toEqual({ kind: "wait", label: "Nothing to do: merged into another case" });
    expect(nextActionFor({ ...base, officeStatuses: ["resolved"] })).toEqual({ kind: "wait", label: "Nothing to do right now" });
  });

  it("never offers an action that would skip a waiting decision", () => {
    // A closed case with an office decision still waiting: the decision comes first.
    expect(nextActionFor({ ...base, closed: true, pendingKinds: ["office_note"] }).kind).toBe("jump");
  });
});
