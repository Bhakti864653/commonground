import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/auth", () => ({ requireAdmin: vi.fn() }));

import { requireAdmin } from "@/lib/admin/auth";
import { reviewAgentSuggestion, reviewReferral } from "@/lib/guide/admin-actions";
import {
  addReferralSuggestion,
  createCase,
  getCaseByCaseNumber,
  removeCaseContent,
  __resetCaseStoreForTests,
} from "@/lib/store/case-store";
import { toPublicCase } from "@/lib/schema/report";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import { publicCaseUrl } from "@/lib/site-url";

const OFFICE = "alcaldia-santiago-oficina";

function caseWithReferral() {
  const c = createCase({
    type: "report",
    communityId: SANTIAGO_VERAGUAS.id,
    categoryId: "garbage-sanitation",
    description: "No pasa el camión de la basura.",
    approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0]),
    consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "es"),
  });
  const suggestion = addReferralSuggestion(
    c.publicCaseNumber,
    {
      contactId: OFFICE,
      urgency: "medium",
      message: `Estimados señores: caso ${c.publicCaseNumber}. Atentamente, Equipo de moderación de CommonGround.`,
      categoryAssessment: "confirmed",
    },
    "private reasoning",
  )!;
  return { caseNumber: c.publicCaseNumber, suggestionId: suggestion.id };
}

const stored = (caseNumber: string) => getCaseByCaseNumber(caseNumber)!;

describe("reviewReferral", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
  });

  it("approving marks the case referred, logs one public entry and a moderation action, and keeps the edited message", async () => {
    const { caseNumber, suggestionId } = caseWithReferral();
    const edited = `Estimada Alcaldía: les compartimos el caso ${caseNumber}. Gracias.`;
    expect(await reviewReferral(caseNumber, suggestionId, "approve", edited)).toEqual({ ok: true });

    const c = stored(caseNumber);
    expect(c.status).toBe("referred");
    expect(c.statusHistory.at(-1)).toMatchObject({
      status: "referred",
      actorType: "moderator",
      kind: "referral_approved",
      contactId: OFFICE,
    });
    expect(c.moderationActions.at(-1)).toMatchObject({ action: "approve_referral", detail: OFFICE });
    const s = c.agentSuggestions.find((x) => x.id === suggestionId)!;
    expect(s.status).toBe("approved");
    expect(s.referral?.message).toBe(edited);
    expect(JSON.stringify(toPublicCase(c))).not.toContain(edited);
  });

  it("rejecting leaves the status alone, records a moderation action, and says so publicly without a reason", async () => {
    const { caseNumber, suggestionId } = caseWithReferral();
    expect(await reviewReferral(caseNumber, suggestionId, "reject")).toEqual({ ok: true });

    const c = stored(caseNumber);
    expect(c.status).toBe("received");
    expect(c.moderationActions.at(-1)).toMatchObject({ action: "reject_referral" });
    expect(c.statusHistory.at(-1)).toMatchObject({ kind: "referral_declined", actorType: "moderator" });
    expect(JSON.stringify(toPublicCase(c))).not.toContain("private reasoning");
  });

  it("refuses an edited message that fails validation, changing nothing", async () => {
    const { caseNumber, suggestionId } = caseWithReferral();
    const result = await reviewReferral(caseNumber, suggestionId, "approve", `Caso ${caseNumber}, llamen al 6612-3344.`);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining("phone") });
    expect(stored(caseNumber).status).toBe("received");
    expect(stored(caseNumber).agentSuggestions[0].status).toBe("pending");
  });

  it("accepts an edited message that keeps the case's own link, but not another link", async () => {
    const { caseNumber, suggestionId } = caseWithReferral();
    const withOther = `Caso ${caseNumber}: https://example.com`;
    expect((await reviewReferral(caseNumber, suggestionId, "approve", withOther)).ok).toBe(false);
    const withOwn = `Caso ${caseNumber}. Caso público: ${publicCaseUrl(caseNumber)}`;
    expect(await reviewReferral(caseNumber, suggestionId, "approve", withOwn)).toEqual({ ok: true });
  });

  it("can only decide a referral once", async () => {
    const { caseNumber, suggestionId } = caseWithReferral();
    await reviewReferral(caseNumber, suggestionId, "approve");
    expect((await reviewReferral(caseNumber, suggestionId, "reject")).ok).toBe(false);
    expect(stored(caseNumber).moderationActions).toHaveLength(1);
  });

  it("won't approve a referral for content a moderator removed", async () => {
    const { caseNumber, suggestionId } = caseWithReferral();
    removeCaseContent(caseNumber, "personal_information", "admin");
    expect((await reviewReferral(caseNumber, suggestionId, "approve")).ok).toBe(false);
  });

  it("can't be approved or rejected through the generic suggestion path", async () => {
    const { caseNumber, suggestionId } = caseWithReferral();
    expect(await reviewAgentSuggestion(caseNumber, suggestionId, "approve")).toBe(false);
    expect(await reviewAgentSuggestion(caseNumber, suggestionId, "reject")).toBe(false);
    expect(stored(caseNumber).agentSuggestions[0].status).toBe("pending");
  });

  it("rejects unauthenticated calls before touching any case", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Admin authentication required"));
    const { caseNumber, suggestionId } = caseWithReferral();
    await expect(reviewReferral(caseNumber, suggestionId, "approve")).rejects.toThrow();
    expect(stored(caseNumber).agentSuggestions[0].status).toBe("pending");
  });
});
