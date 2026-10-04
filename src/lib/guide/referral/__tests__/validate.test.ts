import { describe, expect, it } from "vitest";
import { normalizeClassification, validateReferralMessage } from "@/lib/guide/referral/validate";
import { MAX_REFERRAL_MESSAGE_LENGTH } from "@/lib/schema/report";
import { SANTIAGO_VERAGUAS } from "@/data/communities";

const CASE = "SV-2026-0005";
const ok = `Estimados señores: les escribimos sobre el caso ${CASE}, una alcantarilla tapada en el Área norte. Atentamente.`;

describe("validateReferralMessage", () => {
  it("accepts a plain message that mentions the case number", () => {
    expect(validateReferralMessage(ok, CASE)).toEqual({ valid: true });
  });

  it("does not mistake the case number or a date for a phone number", () => {
    expect(validateReferralMessage(`${ok} Reportado el 3 de octubre de 2026.`, CASE).valid).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["missing case number", "Estimados señores: hay una alcantarilla tapada."],
    ["email", `${ok} Escriban a vecino@example.com`],
    ["link", `${ok} Más en https://example.com/caso`],
    ["phone", `${ok} Llamen al 6998-4809`],
    ["international phone", `${ok} Contacto: +507 935 2444`],
    ["too long", `${ok}${"a".repeat(MAX_REFERRAL_MESSAGE_LENGTH)}`],
  ])("rejects a message with %s", (_label, message) => {
    expect(validateReferralMessage(message, CASE).valid).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(validateReferralMessage(undefined, CASE).valid).toBe(false);
  });
});

describe("normalizeClassification", () => {
  const base = { categoryAssessment: "confirmed", urgency: "medium", reasoning: "r" };

  it("keeps a valid classification", () => {
    expect(normalizeClassification(base, SANTIAGO_VERAGUAS, "flooding-drainage")).toMatchObject({
      categoryAssessment: "confirmed",
      urgency: "medium",
    });
  });

  it("rejects an urgency outside low/medium/high", () => {
    expect(normalizeClassification({ ...base, urgency: "urgent" }, SANTIAGO_VERAGUAS, "other")).toBeNull();
  });

  it("only questions a category when it names a different real one", () => {
    const q = { ...base, categoryAssessment: "questioned" };
    expect(
      normalizeClassification({ ...q, suggestedCategoryId: "garbage-sanitation" }, SANTIAGO_VERAGUAS, "other"),
    ).toMatchObject({ categoryAssessment: "questioned", suggestedCategoryId: "garbage-sanitation" });
    for (const suggestedCategoryId of [undefined, "made-up", "other"]) {
      expect(normalizeClassification({ ...q, suggestedCategoryId }, SANTIAGO_VERAGUAS, "other")).toMatchObject({
        categoryAssessment: "confirmed",
        suggestedCategoryId: undefined,
      });
    }
  });
});
