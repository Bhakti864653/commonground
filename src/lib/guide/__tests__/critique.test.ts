import { describe, expect, it, vi } from "vitest";
import type Groq from "groq-sdk";
import { critiqueSuggestions } from "@/lib/guide/critique";
import type { CaseAnalysisSuggestion } from "@/lib/guide/case-analysis";
import type { Case } from "@/lib/schema/report";

const targetCase = { description: "Test case description" } as Case;

function mockClient(createImpl: (...args: unknown[]) => unknown): Groq {
  return { chat: { completions: { create: vi.fn(createImpl) } } } as unknown as Groq;
}

function toolCallResponse(args: unknown) {
  return {
    choices: [
      {
        message: {
          tool_calls: [{ id: "call_1", function: { name: "record_critique", arguments: JSON.stringify(args) } }],
        },
      },
    ],
  };
}

const duplicateSuggestion: CaseAnalysisSuggestion = {
  kind: "duplicate",
  suggestedValue: "SV-2026-0001",
  reasoning: "matched via search_similar_cases",
};
const verificationSuggestion: CaseAnalysisSuggestion = {
  kind: "verification",
  suggestedValue: "needs_verification",
  reasoning: "description contains a specific claim",
};

describe("critiqueSuggestions", () => {
  it("returns immediately without calling the model when there are no candidates", async () => {
    const create = vi.fn();
    const client = mockClient(create);
    const result = await critiqueSuggestions(client, targetCase, []);
    expect(result.decisions).toEqual([]);
    expect(create).not.toHaveBeenCalled();
  });

  it("does not treat duplicate and verification suggestions as automatically contradictory — both can be kept together", async () => {
    const client = mockClient(() =>
      toolCallResponse({
        verdicts: [
          { index: 0, decision: "keep", reason: "tool-grounded match" },
          { index: 1, decision: "keep", reason: "specific claim quoted" },
        ],
      }),
    );
    const result = await critiqueSuggestions(client, targetCase, [duplicateSuggestion, verificationSuggestion]);
    expect(result.decisions).toHaveLength(2);
    expect(result.decisions.every((d) => d.decision === "keep")).toBe(true);
  });

  it("surfaces a discard reason for a suggestion the model rejects", async () => {
    const client = mockClient(() =>
      toolCallResponse({
        verdicts: [{ index: 0, decision: "discard", reason: "reasoning was too vague" }],
      }),
    );
    const result = await critiqueSuggestions(client, targetCase, [verificationSuggestion]);
    expect(result.decisions[0]).toMatchObject({ decision: "discard", reason: "reasoning was too vague" });
  });

  it("keeps a candidate the model's verdicts never addressed (fails open per-item)", async () => {
    const client = mockClient(() => toolCallResponse({ verdicts: [] }));
    const result = await critiqueSuggestions(client, targetCase, [duplicateSuggestion]);
    expect(result.decisions[0].decision).toBe("keep");
  });

  it("uses the safe fallback (keeps every already-validated candidate) when the model call fails", async () => {
    const client = mockClient(() => {
      throw new Error("network error");
    });
    const result = await critiqueSuggestions(client, targetCase, [duplicateSuggestion, verificationSuggestion]);
    expect(result.decisions).toHaveLength(2);
    expect(result.decisions.every((d) => d.decision === "keep")).toBe(true);
    expect(result.trace.outcome).toMatch(/unavailable/i);
  });

  it("uses the safe fallback when the model returns no tool call at all", async () => {
    const client = mockClient(() => ({ choices: [{ message: {} }] }));
    const result = await critiqueSuggestions(client, targetCase, [duplicateSuggestion]);
    expect(result.decisions[0].decision).toBe("keep");
  });
});
