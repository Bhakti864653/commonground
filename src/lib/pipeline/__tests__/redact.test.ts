import { describe, expect, it } from "vitest";
import { containsPersonalInfo, redactPersonalInfo, REDACTION_TOKEN } from "../redact";

describe("redactPersonalInfo", () => {
  it("removes phone numbers in common formats", () => {
    for (const phone of ["6123-4567", "+507 6123 4567", "(507) 998-1234", "61234567"]) {
      const { text, found } = redactPersonalInfo(`Llámenme al ${phone} por favor`);
      expect(text).not.toContain(phone);
      expect(text).toContain(REDACTION_TOKEN.es);
      expect(found).toContain("phone");
    }
  });

  it("removes emails, Panamanian ID numbers and house numbers", () => {
    const { text, found } = redactPersonalInfo(
      "Escriban a vecina.ana@gmail.com, cédula 8-123-4567, vivo en la casa 14 y el apto #3B",
    );
    expect(text).not.toMatch(/gmail|8-123-4567|casa 14|#3B/);
    expect(found).toEqual(expect.arrayContaining(["email", "id_number", "house_number"]));
  });

  it("removes a name the resident gives, in several languages", () => {
    const cases: Array<[string, string, "es" | "en" | "fr" | "zh" | "hi"]> = [
      ["Hola, me llamo María González y hay un bache", "María González", "es"],
      ["Hi, my name is John Smith, the drain is blocked", "John Smith", "en"],
      ["Bonjour, je m'appelle Claire Dubois", "Claire Dubois", "fr"],
      ["你好，我叫王小明，这里有垃圾", "王小明", "zh"],
      ["नमस्ते, मेरा नाम राहुल है और यहाँ गड्ढा है", "राहुल", "hi"],
    ];
    for (const [input, name, language] of cases) {
      const { text, found } = redactPersonalInfo(input, language);
      expect(text).not.toContain(name);
      expect(text).toContain(REDACTION_TOKEN[language]);
      expect(found).toContain("name");
    }
  });

  it("keeps case numbers, dates, years and ordinary numbers", () => {
    const input = "Igual que el caso SV-2026-0011: desde el 12-10-2026, hace 3 semanas, 2 postes dañados.";
    const { text, found } = redactPersonalInfo(input);
    expect(text).toBe(input);
    expect(found).toEqual([]);
  });

  it("detects remaining personal info", () => {
    expect(containsPersonalInfo("Contacto: 6555-1234")).toBe(true);
    expect(containsPersonalInfo("Bache grande en el área oeste")).toBe(false);
  });
});
