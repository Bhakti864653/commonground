import { beforeEach, describe, expect, it, vi } from "vitest";

const scheduled: Array<() => Promise<void>> = [];
vi.mock("next/server", () => ({ after: (fn: () => Promise<void>) => scheduled.push(fn) }));
const runReferralPipeline = vi.fn();
vi.mock("@/lib/guide/referral/pipeline", () => ({ runReferralPipeline: (n: string) => runReferralPipeline(n) }));

import { submitCase } from "@/lib/store/actions";
import { __resetCaseStoreForTests } from "@/lib/store/case-store";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS } from "@/data/communities";

const input = () => ({
  type: "report" as const,
  communityId: SANTIAGO_VERAGUAS.id,
  categoryId: "flooding-drainage",
  description: "Drain blocked.",
  approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0]),
  consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "es"),
});

describe("submitCase", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
    scheduled.length = 0;
    runReferralPipeline.mockReset();
  });

  it("returns the case number before the referral pipeline runs, then runs it after", async () => {
    const created = await submitCase(input());
    expect(created.publicCaseNumber).toMatch(/^SV-\d{4}-0001$/);
    expect(runReferralPipeline).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);
    await scheduled[0]();
    expect(runReferralPipeline).toHaveBeenCalledWith(created.publicCaseNumber);
  });

  it("never surfaces a pipeline crash", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    runReferralPipeline.mockRejectedValue(new Error("bug"));
    await submitCase(input());
    await expect(scheduled[0]()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it("schedules nothing when the submission is invalid", async () => {
    await expect(submitCase({ ...input(), categoryId: "nope" })).rejects.toThrow();
    expect(scheduled).toHaveLength(0);
  });
});
