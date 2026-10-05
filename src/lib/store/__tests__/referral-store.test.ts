import { beforeEach, describe, expect, it } from "vitest";
import {
  addReferralSuggestion,
  addTimelineEvent,
  createCase,
  getCaseByCaseNumber,
  __resetMemoryCaseStore,
} from "@/lib/store/memory-case-store";
import { toPublicCase, type ReferralDraft } from "@/lib/schema/report";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS } from "@/data/communities";

function newCase() {
  return createCase({
    type: "report",
    communityId: SANTIAGO_VERAGUAS.id,
    categoryId: "flooding-drainage",
    description: "La alcantarilla está tapada.",
    approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0]),
    consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "es"),
  });
}

const draft: ReferralDraft = {
  contactId: "alcaldia-santiago-oficina",
  urgency: "medium",
  message: "Estimados señores de la Alcaldía de Santiago: …",
  categoryAssessment: "confirmed",
};

describe("addTimelineEvent", () => {
  beforeEach(() => __resetMemoryCaseStore());

  it("appends a non-status entry that keeps the case's current status", () => {
    const c = newCase();
    expect(addTimelineEvent(c.publicCaseNumber, { kind: "referral_prepared", actorType: "agent", contactId: draft.contactId })).toBe(true);
    const updated = getCaseByCaseNumber(c.publicCaseNumber)!;
    expect(updated.status).toBe("received");
    expect(updated.statusHistory.at(-1)).toMatchObject({
      kind: "referral_prepared",
      actorType: "agent",
      status: "received",
      contactId: draft.contactId,
    });
  });

  it("returns false for an unknown case", () => {
    expect(addTimelineEvent("SV-2000-9999", { kind: "ai_reviewed", actorType: "agent" })).toBe(false);
  });
});

describe("addReferralSuggestion", () => {
  beforeEach(() => __resetMemoryCaseStore());

  it("stores a pending referral and replaces an older pending one", () => {
    const c = newCase();
    const first = addReferralSuggestion(c.publicCaseNumber, draft, "why");
    const second = addReferralSuggestion(c.publicCaseNumber, { ...draft, urgency: "high" }, "why again");
    const referrals = getCaseByCaseNumber(c.publicCaseNumber)!.agentSuggestions.filter((s) => s.kind === "referral");
    expect(first).not.toBeNull();
    expect(referrals).toHaveLength(1);
    expect(referrals[0]).toMatchObject({ id: second!.id, status: "pending", suggestedValue: draft.contactId });
    expect(referrals[0].referral?.urgency).toBe("high");
  });

  it("rejects an invalid draft", () => {
    const c = newCase();
    expect(addReferralSuggestion(c.publicCaseNumber, { ...draft, message: "" }, "why")).toBeNull();
    expect(addReferralSuggestion(c.publicCaseNumber, { ...draft, urgency: "urgent" as never }, "why")).toBeNull();
  });

  it("never exposes the draft, urgency, or reasoning on the public case", () => {
    const c = newCase();
    addReferralSuggestion(c.publicCaseNumber, draft, "private reasoning");
    addTimelineEvent(c.publicCaseNumber, { kind: "referral_prepared", actorType: "agent", contactId: draft.contactId });
    const serialized = JSON.stringify(toPublicCase(getCaseByCaseNumber(c.publicCaseNumber)!));
    expect(serialized).not.toContain("private reasoning");
    expect(serialized).not.toContain(draft.message);
    expect(serialized).not.toContain("medium");
  });
});
