import { beforeEach, describe, expect, it, vi } from "vitest";
import Groq from "groq-sdk";

const create = vi.fn();
let hasKey = true;
vi.mock("@/lib/guide/groq-client", () => ({
  GUIDE_MODEL: "test-model",
  getGroqClient: () => (hasKey ? { chat: { completions: { create } } } : null),
}));

import { runReferralPipeline } from "@/lib/guide/referral/pipeline";
import { createCase, getCaseByCaseNumber, __resetCaseStoreForTests } from "@/lib/store/case-store";
import { toPublicCase } from "@/lib/schema/report";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS, RIVERBEND_DEMO } from "@/data/communities";
import { formatReportDate } from "@/lib/guide/referral/validate";
import { publicCaseUrl } from "@/lib/site-url";

const TOOL_STEP = {
  record_classification: "classify",
  record_referral_draft: "draft",
  record_referral_review: "critique",
} as const;
type Step = (typeof TOOL_STEP)[keyof typeof TOOL_STEP];

/** Answers each forced tool call by name; an Error value makes that step throw. */
function respondWith(responses: Partial<Record<Step, unknown>>) {
  create.mockImplementation(async (params: { tool_choice: { function: { name: keyof typeof TOOL_STEP } } }) => {
    const name = params.tool_choice.function.name;
    const value = responses[TOOL_STEP[name]];
    if (value instanceof Error) throw value;
    return { choices: [{ message: { tool_calls: [{ function: { name, arguments: JSON.stringify(value) } }] } }] };
  });
}

function newCase(description = "La alcantarilla del área norte lleva tres días tapada.", demo = false) {
  const community = demo ? RIVERBEND_DEMO : SANTIAGO_VERAGUAS;
  return createCase({
    type: "report",
    communityId: community.id,
    categoryId: community.categories[0].id,
    description,
    approximateArea: buildApproximateArea(community.areas[0]),
    consent: buildConsentRecord(community.privacy.consentVersion, "es"),
  });
}

const classify = {
  categoryAssessment: "confirmed",
  urgency: "medium",
  urgencyReason: "Ongoing for days but no immediate danger.",
  reasoning: "Drain blocked for days.",
};
const draftFor = (caseNumber: string) => ({
  message: `Estimados señores de la Alcaldía de Santiago: les escribimos desde CommonGround sobre el caso ${caseNumber}. Atentamente, Equipo de moderación de CommonGround.`,
  routeExplanation: "Municipal office for the district.",
});

const agentKinds = (caseNumber: string) =>
  getCaseByCaseNumber(caseNumber)!.statusHistory.filter((e) => e.actorType === "agent").map((e) => e.kind);
const suggestions = (caseNumber: string) => getCaseByCaseNumber(caseNumber)!.agentSuggestions;

describe("runReferralPipeline", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
    create.mockReset();
    hasKey = true;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("prepares a pending referral to the routed office and logs each step publicly", async () => {
    const c = newCase();
    respondWith({ classify, draft: draftFor(c.publicCaseNumber), critique: { verdict: "ok" } });
    const result = await runReferralPipeline(c.publicCaseNumber);

    expect(result).toMatchObject({ outcome: "prepared", contactId: "alcaldia-santiago-oficina" });
    const referral = suggestions(c.publicCaseNumber).find((s) => s.kind === "referral")!;
    expect(referral.status).toBe("pending");
    expect(referral.referral).toMatchObject({ contactId: "alcaldia-santiago-oficina", urgency: "medium" });
    expect(getCaseByCaseNumber(c.publicCaseNumber)!.status).toBe("received");
    expect(agentKinds(c.publicCaseNumber)).toEqual(["ai_reviewed", "referral_prepared", "awaiting_approval"]);
  });

  it("records why it chose the urgency, and adds the report date and case link to the letter", async () => {
    const c = newCase();
    respondWith({ classify, draft: draftFor(c.publicCaseNumber), critique: { verdict: "ok" } });
    await runReferralPipeline(c.publicCaseNumber);
    const referral = suggestions(c.publicCaseNumber)[0];
    expect(referral.referral?.urgencyReason).toBe(classify.urgencyReason);
    expect(referral.reasoning).toContain(`Urgency (medium): ${classify.urgencyReason}`);
    const message = referral.referral!.message;
    expect(message).toContain(`Fecha del reporte: ${formatReportDate(c.createdAt)}`);
    expect(message).toContain(`Caso público: ${publicCaseUrl(c.publicCaseNumber)}`);
    // The reference sits above the signature, which stays last.
    expect(message.trimEnd().endsWith("Equipo de moderación de CommonGround.")).toBe(true);
  });

  it("never lets the model pick the office — routing comes from the config", async () => {
    const c = newCase();
    respondWith({
      classify,
      draft: { ...draftFor(c.publicCaseNumber), routeExplanation: "Send it to 911." },
      critique: { verdict: "ok" },
    });
    expect(await runReferralPipeline(c.publicCaseNumber)).toMatchObject({ contactId: "alcaldia-santiago-oficina" });
  });

  it("does nothing public and calls no model when there is no API key", async () => {
    hasKey = false;
    const c = newCase();
    expect(await runReferralPipeline(c.publicCaseNumber)).toMatchObject({ outcome: "skipped", reason: "no_api_key" });
    expect(create).not.toHaveBeenCalled();
    expect(agentKinds(c.publicCaseNumber)).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("[referral-agent]"));
  });

  it("fails safely when Groq errors during classification", async () => {
    const c = newCase();
    respondWith({ classify: new Groq.APIError(429, undefined, "rate limited", undefined) });
    expect(await runReferralPipeline(c.publicCaseNumber)).toMatchObject({ outcome: "skipped", reason: "classify_failed" });
    expect(agentKinds(c.publicCaseNumber)).toEqual([]);
    expect(suggestions(c.publicCaseNumber)).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Groq 429"));
  });

  it("records the review but prepares nothing when drafting fails", async () => {
    const c = newCase();
    respondWith({ classify, draft: new Error("timeout") });
    expect(await runReferralPipeline(c.publicCaseNumber)).toMatchObject({ reason: "draft_failed" });
    expect(agentKinds(c.publicCaseNumber)).toEqual(["ai_reviewed"]);
    expect(suggestions(c.publicCaseNumber)).toEqual([]);
  });

  it("discards a draft that fails deterministic validation (e.g. contains a phone number)", async () => {
    const c = newCase();
    const draft = draftFor(c.publicCaseNumber);
    respondWith({ classify, draft: { ...draft, message: `${draft.message} Tel. 6998-4809` } });
    expect(await runReferralPipeline(c.publicCaseNumber)).toMatchObject({ reason: "draft_invalid" });
    expect(suggestions(c.publicCaseNumber)).toEqual([]);
  });

  it("keeps the draft with a note when the review step fails or raises concerns", async () => {
    const c = newCase();
    respondWith({ classify, draft: draftFor(c.publicCaseNumber), critique: new Error("down") });
    expect(await runReferralPipeline(c.publicCaseNumber)).toMatchObject({ outcome: "prepared" });
    expect(suggestions(c.publicCaseNumber)[0].reasoning).toContain("Review step unavailable");

    const d = newCase();
    respondWith({ classify, draft: draftFor(d.publicCaseNumber), critique: { verdict: "concerns", concerns: "Adds a date." } });
    await runReferralPipeline(d.publicCaseNumber);
    expect(suggestions(d.publicCaseNumber)[0].reasoning).toContain("Adds a date.");
  });

  it("prepares no referral for an emergency report", async () => {
    const c = newCase("Hay peligro inmediato en mi calle, hay un cable caído.");
    respondWith({ classify, draft: draftFor(c.publicCaseNumber), critique: { verdict: "ok" } });
    expect(await runReferralPipeline(c.publicCaseNumber)).toMatchObject({ reason: "emergency" });
    expect(agentKinds(c.publicCaseNumber)).toEqual(["ai_reviewed"]);
    expect(suggestions(c.publicCaseNumber)).toEqual([]);
  });

  it("skips quietly for a community without routing", async () => {
    const c = newCase("A pothole on Main Street.", true);
    expect(await runReferralPipeline(c.publicCaseNumber)).toMatchObject({ reason: "no_routing" });
    expect(create).not.toHaveBeenCalled();
  });

  it("keeps the drafted message, urgency and reasoning off the public case", async () => {
    const c = newCase();
    const draft = draftFor(c.publicCaseNumber);
    respondWith({ classify, draft, critique: { verdict: "ok" } });
    await runReferralPipeline(c.publicCaseNumber);
    const publicJson = JSON.stringify(toPublicCase(getCaseByCaseNumber(c.publicCaseNumber)!));
    expect(publicJson).not.toContain(draft.message);
    expect(publicJson).not.toContain(classify.reasoning);
    expect(publicJson).not.toContain("medium");
  });
});
