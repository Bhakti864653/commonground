import { describe, expect, it } from "vitest";
import { CommunityConfigSchema } from "../community";
import { SANTIAGO_VERAGUAS, RIVERBEND_DEMO, COMMUNITIES } from "@/data/communities";

describe("CommunityConfig", () => {
  it("validates the Santiago de Veraguas pilot config", () => {
    expect(() => CommunityConfigSchema.parse(SANTIAGO_VERAGUAS)).not.toThrow();
    expect(SANTIAGO_VERAGUAS.status).toBe("pilot");
    expect(SANTIAGO_VERAGUAS.country).toBe("Panama");
  });

  it("validates the fictional Riverbend demo config", () => {
    expect(() => CommunityConfigSchema.parse(RIVERBEND_DEMO)).not.toThrow();
    expect(RIVERBEND_DEMO.status).toBe("demo");
  });

  it("proves the architecture generalizes: two communities, different languages/categories, same schema", () => {
    expect(COMMUNITIES).toHaveLength(2);
    const ids = COMMUNITIES.map((c) => c.id);
    expect(ids).toEqual(["santiago-veraguas", "riverbend-demo"]);
    expect(SANTIAGO_VERAGUAS.defaultLanguage).toBe("es");
    expect(RIVERBEND_DEMO.defaultLanguage).toBe("en");
  });

  it("requires every category to carry both an icon and a text label (spec §6)", () => {
    for (const community of COMMUNITIES) {
      for (const category of community.categories) {
        expect(category.icon).toBeTruthy();
        expect(category.label).toBeTruthy();
        expect(category.labelEs).toBeTruthy();
      }
    }
  });

  it("never allows an unlabeled demo community", () => {
    expect(RIVERBEND_DEMO.displayName.toLowerCase()).toContain("fictional");
  });
});
