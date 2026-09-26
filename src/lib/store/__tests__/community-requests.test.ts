import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_STORED_REQUESTS,
  __resetCommunityRequestsForTests,
  listCommunityRequestSummaries,
  placeKeyOf,
  recordCommunityRequest,
} from "@/lib/store/community-request-store";
import { requestCommunity } from "@/lib/store/actions";

describe("community requests", () => {
  beforeEach(() => __resetCommunityRequestsForTests());

  it("groups requests for the same place regardless of accents, case, and spacing", () => {
    recordCommunityRequest({ placeName: "Montréal", language: "fr", note: "Nids-de-poule" });
    recordCommunityRequest({ placeName: "montreal ", language: "en" });
    recordCommunityRequest({ placeName: "Toronto", language: "en" });
    const summaries = listCommunityRequestSummaries();
    expect(summaries.map((s) => [s.placeName, s.count])).toEqual([
      ["montreal", 2],
      ["Toronto", 1],
    ]);
    expect(summaries[0].notes).toEqual(["Nids-de-poule"]);
    expect(placeKeyOf("  São   Paulo ")).toBe("sao paulo");
  });

  it("stores only place, optional note, language, and time — never contact details", () => {
    recordCommunityRequest({ placeName: "Calgary", language: "en", email: "someone@example.com", name: "Someone" });
    const json = JSON.stringify(listCommunityRequestSummaries());
    expect(json).not.toContain("someone@example.com");
    expect(json).not.toContain("Someone");
  });

  it("rejects invalid input", () => {
    expect(recordCommunityRequest({ placeName: "", language: "en" })).toBe(false);
    expect(recordCommunityRequest({ placeName: "x".repeat(61), language: "en" })).toBe(false);
    expect(recordCommunityRequest({ placeName: "Ottawa", language: "de" })).toBe(false);
    expect(recordCommunityRequest({ placeName: "Ottawa", language: "en", note: "x".repeat(501) })).toBe(false);
    expect(recordCommunityRequest("Ottawa")).toBe(false);
    expect(listCommunityRequestSummaries()).toEqual([]);
  });

  it("caps how many requests are kept", () => {
    for (let i = 0; i < MAX_STORED_REQUESTS + 5; i++) recordCommunityRequest({ placeName: `Place ${i}`, language: "en" });
    const total = listCommunityRequestSummaries().reduce((n, s) => n + s.count, 0);
    expect(total).toBe(MAX_STORED_REQUESTS);
    expect(listCommunityRequestSummaries().some((s) => s.placeName === "Place 0")).toBe(false);
  });

  it("is reachable through the public action", async () => {
    expect(await requestCommunity({ placeName: "Vancouver", language: "en" })).toBe(true);
    expect(await requestCommunity({ placeName: 42, language: "en" })).toBe(false);
  });
});
