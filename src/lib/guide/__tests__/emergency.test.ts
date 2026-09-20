import { describe, expect, it } from "vitest";
import { detectEmergencyPhrase } from "@/lib/guide/emergency";

describe("detectEmergencyPhrase", () => {
  it("catches English and Spanish trigger phrases", () => {
    expect(detectEmergencyPhrase("There is a fire on my street")).toBe(true);
    expect(detectEmergencyPhrase("hay peligro inmediato en mi casa")).toBe(true);
    expect(detectEmergencyPhrase("Someone said person injured near the plaza")).toBe(true);
  });

  it("is accent-insensitive for Spanish phrases", () => {
    expect(detectEmergencyPhrase("HAY PELIGRO INMEDIATO")).toBe(true);
  });

  it("does not trigger on ordinary text", () => {
    expect(detectEmergencyPhrase("The streetlight has been broken for a week")).toBe(false);
    expect(detectEmergencyPhrase("¿Cómo reporto un bache en la calle?")).toBe(false);
  });
});
