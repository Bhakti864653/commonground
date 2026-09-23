import { describe, expect, it } from "vitest";
import { detectEmergencyPhrase } from "@/lib/guide/emergency";

describe("detectEmergencyPhrase", () => {
  it("catches English and Spanish trigger phrases", () => {
    expect(detectEmergencyPhrase("There is a fire on my street")).toBe(true);
    expect(detectEmergencyPhrase("hay peligro inmediato en mi casa")).toBe(true);
    expect(detectEmergencyPhrase("Someone said person injured near the plaza")).toBe(true);
  });

  it("treats a gas leak as an emergency in both languages", () => {
    expect(detectEmergencyPhrase("Hay una fuga de gas en mi casa")).toBe(true);
    expect(detectEmergencyPhrase("Hay olor a gas en mi cocina")).toBe(true);
    expect(detectEmergencyPhrase("La casa de al lado huele a gas")).toBe(true);
    expect(detectEmergencyPhrase("I think there's a gas leak next door")).toBe(true);
    expect(detectEmergencyPhrase("I can smell gas in the hallway")).toBe(true);
    expect(detectEmergencyPhrase("It smells like gas in here")).toBe(true);
  });

  it("does not treat an ordinary mention of gas as an emergency", () => {
    expect(detectEmergencyPhrase("¿Dónde queda la estación de gas más cercana?")).toBe(false);
    expect(detectEmergencyPhrase("The gas station on the corner closed")).toBe(false);
  });

  it("is accent-insensitive for Spanish phrases", () => {
    expect(detectEmergencyPhrase("HAY PELIGRO INMEDIATO")).toBe(true);
  });

  it("does not trigger on ordinary text", () => {
    expect(detectEmergencyPhrase("The streetlight has been broken for a week")).toBe(false);
    expect(detectEmergencyPhrase("¿Cómo reporto un bache en la calle?")).toBe(false);
  });
});
