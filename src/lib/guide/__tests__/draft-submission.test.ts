import { describe, expect, it } from "vitest";
import { buildDraftSubmissionTool, parseDraftSubmissionArgs } from "@/lib/guide/draft-submission";
import { SANTIAGO_VERAGUAS } from "@/data/communities";

describe("buildDraftSubmissionTool", () => {
  it("enumerates the community's real category ids plus prefer_not_to_say for area", () => {
    const tool = buildDraftSubmissionTool(SANTIAGO_VERAGUAS);
    const params = tool.function!.parameters as {
      properties: { categoryId: { enum: string[] }; areaId: { enum: string[] } };
    };
    expect(params.properties.categoryId.enum).toEqual(
      SANTIAGO_VERAGUAS.categories.map((c) => c.id),
    );
    expect(params.properties.areaId.enum).toEqual([
      ...SANTIAGO_VERAGUAS.areas.map((a) => a.id),
      "prefer_not_to_say",
    ]);
  });
});

describe("parseDraftSubmissionArgs", () => {
  const validArgs = () =>
    JSON.stringify({
      type: "report",
      categoryId: SANTIAGO_VERAGUAS.categories[0].id,
      description: "  Hay un bache grande en la calle.  ",
      areaId: SANTIAGO_VERAGUAS.areas[0].id,
    });

  it("accepts valid arguments and trims the description", () => {
    const result = parseDraftSubmissionArgs(validArgs(), SANTIAGO_VERAGUAS);
    expect(result).toEqual({
      ok: true,
      draft: {
        type: "report",
        categoryId: SANTIAGO_VERAGUAS.categories[0].id,
        description: "Hay un bache grande en la calle.",
        areaId: SANTIAGO_VERAGUAS.areas[0].id,
      },
    });
  });

  it("maps prefer_not_to_say to a null areaId", () => {
    const result = parseDraftSubmissionArgs(
      JSON.stringify({
        type: "proposal",
        categoryId: SANTIAGO_VERAGUAS.categories[0].id,
        description: "Propongo algo.",
        areaId: "prefer_not_to_say",
      }),
      SANTIAGO_VERAGUAS,
    );
    expect(result.ok).toBe(true);
    expect(result.ok && result.draft.areaId).toBeNull();
  });

  it("rejects a categoryId that doesn't exist in this community, even if the JSON is well-formed", () => {
    const result = parseDraftSubmissionArgs(
      JSON.stringify({
        type: "report",
        categoryId: "invented-category",
        description: "Something",
        areaId: "prefer_not_to_say",
      }),
      SANTIAGO_VERAGUAS,
    );
    expect(result).toEqual({ ok: false, error: expect.stringContaining("invented-category") });
  });

  it("rejects an areaId that doesn't exist in this community", () => {
    const result = parseDraftSubmissionArgs(
      JSON.stringify({
        type: "report",
        categoryId: SANTIAGO_VERAGUAS.categories[0].id,
        description: "Something",
        areaId: "nonexistent-area",
      }),
      SANTIAGO_VERAGUAS,
    );
    expect(result).toEqual({ ok: false, error: expect.stringContaining("nonexistent-area") });
  });

  it("rejects malformed JSON without throwing", () => {
    const result = parseDraftSubmissionArgs("not json", SANTIAGO_VERAGUAS);
    expect(result).toEqual({ ok: false, error: "Invalid arguments" });
  });

  it("rejects missing required fields without throwing", () => {
    const result = parseDraftSubmissionArgs(JSON.stringify({ type: "report" }), SANTIAGO_VERAGUAS);
    expect(result.ok).toBe(false);
  });

  it("rejects an empty description", () => {
    const result = parseDraftSubmissionArgs(
      JSON.stringify({
        type: "report",
        categoryId: SANTIAGO_VERAGUAS.categories[0].id,
        description: "",
        areaId: "prefer_not_to_say",
      }),
      SANTIAGO_VERAGUAS,
    );
    expect(result.ok).toBe(false);
  });
});
