import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/auth", () => ({ requireAdmin: vi.fn() }));

import { adminRemoveContent, adminRestoreContent } from "@/lib/store/admin-actions";
import {
  __resetCaseStoreForTests,
  createCase,
  flagInaccuracy,
  getCaseByCaseNumber,
  listCasesForCommunity,
  removeCaseContent,
  restoreCaseContent,
} from "@/lib/store/case-store";
import { executeTool } from "@/lib/guide/tools";
import { toPublicCase } from "@/lib/schema/report";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS } from "@/data/communities";

function makeCase(description = "Mi vecino Juan Pérez tira basura, su teléfono es 6000-0000") {
  return createCase({
    type: "report",
    communityId: SANTIAGO_VERAGUAS.id,
    categoryId: SANTIAGO_VERAGUAS.categories[0].id,
    description,
    approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0]),
    consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "es"),
  });
}

describe("moderator content removal", () => {
  beforeEach(() => __resetCaseStoreForTests());

  it("hides the content from lists and the public shape, but keeps the case and its reason", () => {
    const c = makeCase();
    expect(removeCaseContent(c.publicCaseNumber, "personal_information", "admin", "names a neighbor")).toBe(true);

    expect(listCasesForCommunity(SANTIAGO_VERAGUAS.id).map((x) => x.publicCaseNumber)).not.toContain(c.publicCaseNumber);
    const stored = getCaseByCaseNumber(c.publicCaseNumber);
    expect(stored?.removal?.reason).toBe("personal_information");

    const publicShape = toPublicCase(stored!);
    expect(publicShape.description).toBe("");
    expect(JSON.stringify(publicShape)).not.toContain("Juan");
    expect(publicShape.removal?.reason).toBe("personal_information");
  });

  it("records the removal, with the private note only in the moderator history", () => {
    const c = makeCase();
    removeCaseContent(c.publicCaseNumber, "accusation_or_harassment", "admin", "named a person");
    const stored = getCaseByCaseNumber(c.publicCaseNumber)!;
    const action = stored.moderationActions.at(-1);
    expect(action?.action).toBe("remove_content");
    expect(action?.detail).toContain("named a person");
    expect(JSON.stringify(toPublicCase(stored))).not.toContain("named a person");
  });

  it("can be restored, which is also recorded", () => {
    const c = makeCase("Hay un bache grande en la calle");
    removeCaseContent(c.publicCaseNumber, "off_topic", "admin");
    expect(restoreCaseContent(c.publicCaseNumber, "admin")).toBe(true);
    const stored = getCaseByCaseNumber(c.publicCaseNumber)!;
    expect(stored.removal).toBeUndefined();
    expect(toPublicCase(stored).description).toBe("Hay un bache grande en la calle");
    expect(stored.moderationActions.at(-1)?.action).toBe("restore_content");
    expect(listCasesForCommunity(SANTIAGO_VERAGUAS.id)).toHaveLength(1);
  });

  it("refuses to remove twice, restore something not removed, or flag removed content", () => {
    const c = makeCase();
    expect(restoreCaseContent(c.publicCaseNumber, "admin")).toBe(false);
    removeCaseContent(c.publicCaseNumber, "spam_or_advertising", "admin");
    expect(removeCaseContent(c.publicCaseNumber, "spam_or_advertising", "admin")).toBe(false);
    expect(flagInaccuracy(c.publicCaseNumber, "wrong")).toBe(false);
  });

  it("never lets the Guide read removed content", async () => {
    const c = makeCase();
    removeCaseContent(c.publicCaseNumber, "personal_information", "admin");
    const details = await executeTool("get_case_details", JSON.stringify({ caseNumber: c.publicCaseNumber }), {
      communityId: SANTIAGO_VERAGUAS.id,
    });
    expect(JSON.stringify(details)).not.toContain("Juan");
    const similar = await executeTool("search_similar_cases", "{}", { communityId: SANTIAGO_VERAGUAS.id });
    expect(JSON.stringify(similar)).not.toContain("Juan");
  });

  it("validates the admin action's input at runtime", async () => {
    const c = makeCase();
    expect(await adminRemoveContent(c.publicCaseNumber, "made_up_reason")).toBe(false);
    expect(await adminRemoveContent(c.publicCaseNumber, "personal_information", "x".repeat(501))).toBe(false);
    expect(await adminRemoveContent(c.publicCaseNumber, "personal_information")).toBe(true);
    expect(await adminRestoreContent(c.publicCaseNumber)).toBe(true);
  });
});
