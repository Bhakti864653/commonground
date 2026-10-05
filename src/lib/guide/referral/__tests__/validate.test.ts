import { describe, expect, it } from "vitest";
import { addCaseReference, formatReportDate, normalizeClassification, validateReferralMessage } from "@/lib/guide/referral/validate";
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

describe("the case link and report date", () => {
  const url = `https://commonground-psi.vercel.app/cases/${CASE}`;

  it("allows exactly the case's own public link, and no other", () => {
    expect(validateReferralMessage(`${ok}\nCaso público: ${url}`, CASE, url).valid).toBe(true);
    expect(validateReferralMessage(`${ok}\nCaso público: ${url}`, CASE).valid).toBe(false);
    expect(validateReferralMessage(`${ok}\n${url} y https://example.com`, CASE, url).valid).toBe(false);
    expect(validateReferralMessage(`${ok}\nhttps://commonground-psi.vercel.app/cases/SV-2026-0001`, CASE, url).valid).toBe(false);
  });

  it("puts the reference just above the signature, or at the end if there is none", () => {
    const signed = "Estimados señores:\n\nTexto.\n\nEquipo de moderación de CommonGround";
    expect(addCaseReference(signed, "4 de octubre de 2026", url)).toBe(
      `Estimados señores:\n\nTexto.\n\nFecha del reporte: 4 de octubre de 2026\nCaso público: ${url}\n\nEquipo de moderación de CommonGround`,
    );
    expect(addCaseReference("Texto.", "4 de octubre de 2026", url)).toBe(
      `Texto.\n\nFecha del reporte: 4 de octubre de 2026\nCaso público: ${url}`,
    );
  });

  it("formats the report date in Spanish, in Panama's time zone", () => {
    // 02:00 UTC on Oct 5 is still Oct 4 in Panama (UTC-5).
    expect(formatReportDate("2026-10-05T02:00:00Z")).toBe("4 de octubre de 2026");
  });
});
