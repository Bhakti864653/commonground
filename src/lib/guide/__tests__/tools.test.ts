import { beforeEach, describe, expect, it } from "vitest";
import { executeTool } from "@/lib/guide/tools";
import { addAdminNote, createCase, __resetCaseStoreForTests } from "@/lib/store/case-store";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS } from "@/data/communities";

function createTestCase() {
  return createCase({
    type: "report",
    communityId: SANTIAGO_VERAGUAS.id,
    categoryId: SANTIAGO_VERAGUAS.categories[0].id,
    description: "Test case for tool leakage checks",
    approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0], "en"),
    consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "en"),
  });
}

describe("executeTool", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
  });

  it("search_similar_cases never includes any private field, even after a private note is added", () => {
    const created = createTestCase();
    addAdminNote(created.publicCaseNumber, "PRIVATE moderator note", "admin");
    // A second case so the first isn't excluded as "self".
    createTestCase();

    return executeTool("search_similar_cases", "{}", {
      communityId: SANTIAGO_VERAGUAS.id,
    }).then((result) => {
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("PRIVATE");
      expect(serialized).not.toContain("managementToken");
      expect(serialized).not.toContain("adminNotes");
      expect(serialized).not.toContain("moderationActions");
    });
  });

  it("get_case_details never includes any private field", async () => {
    const created = createTestCase();
    addAdminNote(created.publicCaseNumber, "PRIVATE moderator note", "admin");

    const result = await executeTool(
      "get_case_details",
      JSON.stringify({ caseNumber: created.publicCaseNumber }),
      { communityId: SANTIAGO_VERAGUAS.id },
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("PRIVATE");
    expect(serialized).not.toContain("managementToken");
    expect(serialized).not.toContain("adminNotes");
  });

  it("returns an error rather than throwing for an unrecognized tool name", async () => {
    const result = await executeTool("delete_everything", "{}", {
      communityId: SANTIAGO_VERAGUAS.id,
    });
    expect(result).toHaveProperty("error");
  });

  it("refuses to return a case from a different community", async () => {
    const created = createTestCase();
    const result = await executeTool(
      "get_case_details",
      JSON.stringify({ caseNumber: created.publicCaseNumber }),
      { communityId: "riverbend-demo" },
    );
    expect(result).toHaveProperty("error");
  });
});
