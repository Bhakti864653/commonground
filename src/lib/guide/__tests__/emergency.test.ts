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

  it("catches the same emergencies in Portuguese, French, and Chinese", () => {
    expect(detectEmergencyPhrase("Tem um vazamento de gás na minha casa")).toBe(true);
    expect(detectEmergencyPhrase("Há perigo imediato na rua")).toBe(true);
    expect(detectEmergencyPhrase("Il y a le feu dans l’immeuble")).toBe(true);
    expect(detectEmergencyPhrase("Une fuite de gaz dans la cuisine")).toBe(true);
    expect(detectEmergencyPhrase("Ça sent le gaz ici")).toBe(true);
    expect(detectEmergencyPhrase("我家煤气泄漏了")).toBe(true);
    expect(detectEmergencyPhrase("楼下着火了")).toBe(true);
    expect(detectEmergencyPhrase("路口有人受伤")).toBe(true);
  });

  it("does not fire on everyday words that merely contain a short trigger", () => {
    expect(detectEmergencyPhrase("Les feuilles bouchent la gouttière")).toBe(false);
    expect(detectEmergencyPhrase("O fogão comunitário precisa de conserto")).toBe(false);
    expect(detectEmergencyPhrase("路灯不亮了")).toBe(false);
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
