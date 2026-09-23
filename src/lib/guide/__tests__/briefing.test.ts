import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/guide/groq-client", () => ({ getGroqClient: vi.fn(), GUIDE_MODEL: "test-model" }));
vi.mock("@/lib/store/case-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/store/case-store")>();
  return { ...actual, listCasesForCommunity: vi.fn() };
});

import { generateCommunityBriefing } from "@/lib/guide/briefing";
import { getGroqClient } from "@/lib/guide/groq-client";
import { listCasesForCommunity } from "@/lib/store/case-store";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import { createCase, __resetCaseStoreForTests } from "@/lib/store/case-store";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import type Groq from "groq-sdk";

function mockClient(createImpl: (...args: unknown[]) => unknown) {
  return { chat: { completions: { create: vi.fn(createImpl) } } } as unknown as Groq;
}

function toolCallResponse(name: string, args: unknown) {
  return {
    choices: [{ message: { tool_calls: [{ id: "call_1", function: { name, arguments: JSON.stringify(args) } }] } }],
  };
}

function makeRealCase(description: string) {
  return createCase({
    type: "report",
    communityId: SANTIAGO_VERAGUAS.id,
    categoryId: SANTIAGO_VERAGUAS.categories[0].id,
    description,
    approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0], "en"),
    consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "en"),
  });
}

describe("generateCommunityBriefing", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
    vi.clearAllMocks();
  });

  it("returns an empty briefing without calling the model when the community has no cases", async () => {
    vi.mocked(listCasesForCommunity).mockReturnValue([]);
    const create = vi.fn();
    vi.mocked(getGroqClient).mockReturnValue(mockClient(create));

    const result = await generateCommunityBriefing(SANTIAGO_VERAGUAS.id);
    expect(result).toEqual({ items: [], generatedAt: expect.any(String) });
    expect(create).not.toHaveBeenCalled();
  });

  it("returns null (not a throw) when the Groq call fails", async () => {
    vi.mocked(listCasesForCommunity).mockReturnValue([makeRealCase("A real case")]);
    vi.mocked(getGroqClient).mockReturnValue(
      mockClient(() => {
        throw new Error("groq unavailable");
      }),
    );

    const result = await generateCommunityBriefing(SANTIAGO_VERAGUAS.id);
    expect(result).toBeNull();
  });

  it("rejects a briefing item referencing an invented case number", async () => {
    const real = makeRealCase("A real case");
    vi.mocked(listCasesForCommunity).mockReturnValue([real]);

    // The model's first turn calls the list tool; its second turn records the briefing.
    let call = 0;
    const client = mockClient(() => {
      call++;
      if (call === 1) return toolCallResponse("list_all_cases_for_briefing", {});
      return toolCallResponse("record_briefing", {
        items: [{ kind: "pattern", caseNumbers: ["SV-2026-9999"], note: "invented" }],
      });
    });
    vi.mocked(getGroqClient).mockReturnValue(client);

    const result = await generateCommunityBriefing(SANTIAGO_VERAGUAS.id);
    expect(result?.items).toEqual([]);
  });

  it("rejects a briefing item referencing a real case number from a different community", async () => {
    const santiagoCase = makeRealCase("A Santiago case");
    vi.mocked(listCasesForCommunity).mockImplementation((communityId: string) =>
      communityId === SANTIAGO_VERAGUAS.id ? [santiagoCase] : [],
    );

    let call = 0;
    const client = mockClient(() => {
      call++;
      if (call === 1) return toolCallResponse("list_all_cases_for_briefing", {});
      // References a real-looking case number that was never returned for THIS community.
      return toolCallResponse("record_briefing", {
        items: [{ kind: "duplicate", caseNumbers: ["RD-2026-0001"], note: "cross-community reference" }],
      });
    });
    vi.mocked(getGroqClient).mockReturnValue(client);

    const result = await generateCommunityBriefing(SANTIAGO_VERAGUAS.id);
    expect(result?.items).toEqual([]);
  });

  it("accepts a briefing item referencing a real case number the list tool actually returned", async () => {
    const real = makeRealCase("A real case");
    vi.mocked(listCasesForCommunity).mockReturnValue([real]);

    let call = 0;
    const client = mockClient(() => {
      call++;
      if (call === 1) return toolCallResponse("list_all_cases_for_briefing", {});
      return toolCallResponse("record_briefing", {
        items: [{ kind: "stale", caseNumbers: [real.publicCaseNumber], note: "no update in a while" }],
      });
    });
    vi.mocked(getGroqClient).mockReturnValue(client);

    const result = await generateCommunityBriefing(SANTIAGO_VERAGUAS.id);
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0].caseNumbers).toEqual([real.publicCaseNumber]);
  });

  it("never sends private case fields (admin notes, management token) to the model", async () => {
    const real = makeRealCase("A real case");
    // A private note, added directly on the in-memory object — the briefing tool must never
    // surface this, the same discipline tools.test.ts already verifies for the shared Guide
    // tools; this is a separate implementation (list_all_cases_for_briefing), so it gets its
    // own direct check.
    real.adminNotes.push({ id: "note-1", authorId: "admin", createdAt: new Date().toISOString(), note: "PRIVATE" });
    vi.mocked(listCasesForCommunity).mockReturnValue([real]);

    let sentToolContent = "";
    let call = 0;
    const client = mockClient((params: unknown) => {
      call++;
      if (call === 1) {
        return toolCallResponse("list_all_cases_for_briefing", {});
      }
      const messages = (params as { messages: Array<{ role: string; content: string }> }).messages;
      sentToolContent = messages.find((m) => m.role === "tool")?.content ?? "";
      return toolCallResponse("record_briefing", { items: [] });
    });
    vi.mocked(getGroqClient).mockReturnValue(client);

    await generateCommunityBriefing(SANTIAGO_VERAGUAS.id);
    expect(sentToolContent).not.toContain("PRIVATE");
    expect(sentToolContent).not.toContain("managementToken");
    expect(sentToolContent).not.toContain("adminNotes");
  });
});
