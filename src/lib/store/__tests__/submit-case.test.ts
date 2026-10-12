import { beforeEach, describe, expect, it, vi } from "vitest";

const scheduled: Array<() => Promise<void>> = [];
vi.mock("next/server", () => ({ after: (fn: () => Promise<void>) => scheduled.push(fn) }));
const runIntake = vi.fn();
vi.mock("@/lib/pipeline/pipeline", () => ({
  runIntake: (...args: unknown[]) => runIntake(...args),
  getPublishedSummary: async () => null,
}));

import { submitCase } from "@/lib/store/actions";
import { __resetCaseStoreForTests, getCaseByCaseNumber } from "@/lib/store/case-store";
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
    runIntake.mockReset();
  });

  it("returns the case number before the agentic pipeline runs, then runs it after", async () => {
    const created = await submitCase(input(), { title: "Drain" });
    expect(created.publicCaseNumber).toMatch(/^SV-\d{4}-0001$/);
    expect(runIntake).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);
    await scheduled[0]();
    expect(runIntake).toHaveBeenCalledWith(created.publicCaseNumber, { title: "Drain", redacted: [] });
  });

  it("removes personal details before saving, and reports what was removed", async () => {
    const created = await submitCase({ ...input(), description: "Drain blocked. Call me at 6123-4567, my name is John Smith." });
    expect(created.redacted).toEqual(expect.arrayContaining(["phone", "name"]));
    const saved = await getCaseByCaseNumber(created.publicCaseNumber);
    expect(saved?.description).not.toMatch(/6123-4567|John Smith/);
    expect(saved?.description).toContain("Drain blocked.");
  });

  it("never surfaces a pipeline crash", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    runIntake.mockRejectedValue(new Error("bug"));
    await submitCase(input());
    await expect(scheduled[0]()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it("schedules nothing when the submission is invalid", async () => {
    await expect(submitCase({ ...input(), categoryId: "nope" })).rejects.toThrow();
    expect(scheduled).toHaveLength(0);
  });
});
