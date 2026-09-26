import { describe, expect, it } from "vitest";
import {
  REVIEW_AFTER_DAYS,
  canShowAsOfficial,
  parseCheckDate,
  sortForReview,
  sourceFreshness,
} from "@/lib/sources/freshness";

const NOW = new Date("2026-09-25T15:00:00Z");
const daysBefore = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString().slice(0, 10);

describe("sourceFreshness", () => {
  it("is current when verified and checked recently, with a next-review date", () => {
    const f = sourceFreshness({ verified: true, lastVerifiedAt: "2026-09-25" }, NOW);
    expect(f.state).toBe("current");
    expect(f.checkedOn?.toISOString().slice(0, 10)).toBe("2026-09-25");
    expect(f.nextReviewDue?.toISOString().slice(0, 10)).toBe("2027-03-24");
  });

  it("stays current up to the review window, then becomes review_due", () => {
    expect(sourceFreshness({ verified: true, lastVerifiedAt: daysBefore(REVIEW_AFTER_DAYS - 1) }, NOW).state).toBe("current");
    expect(sourceFreshness({ verified: true, lastVerifiedAt: daysBefore(REVIEW_AFTER_DAYS + 1) }, NOW).state).toBe("review_due");
  });

  it("treats a missing verification date as unverified, even if marked verified", () => {
    expect(sourceFreshness({ verified: true }, NOW)).toEqual({ state: "unverified" });
    expect(sourceFreshness({ verified: true, lastVerifiedAt: "" }, NOW).state).toBe("unverified");
  });

  it("treats invalid and future dates as unverified", () => {
    for (const bad of ["banana", "2026-02-31", "2026-13-01", "25/09/2026"]) {
      expect(sourceFreshness({ verified: true, lastVerifiedAt: bad }, NOW).state, bad).toBe("unverified");
    }
    expect(sourceFreshness({ verified: true, lastVerifiedAt: "2026-12-01" }, NOW).state).toBe("unverified");
  });

  it("never lets an unverified entry count as checked, whatever its date", () => {
    expect(sourceFreshness({ verified: false, lastVerifiedAt: "2026-09-25" }, NOW)).toEqual({ state: "unverified" });
  });

  it("parses calendar dates and full timestamps", () => {
    expect(parseCheckDate("2026-09-25")?.toISOString()).toBe("2026-09-25T12:00:00.000Z");
    expect(parseCheckDate("2026-09-25T08:30:00Z")?.toISOString()).toBe("2026-09-25T08:30:00.000Z");
    expect(parseCheckDate(undefined)).toBeUndefined();
  });
});

describe("sortForReview", () => {
  it("puts review-due first, then unverified, then current, oldest first within a group", () => {
    const entries = [
      { id: "current-new", verified: true, lastVerifiedAt: daysBefore(1) },
      { id: "unverified", verified: false },
      { id: "overdue-recent", verified: true, lastVerifiedAt: daysBefore(200) },
      { id: "current-old", verified: true, lastVerifiedAt: daysBefore(100) },
      { id: "overdue-oldest", verified: true, lastVerifiedAt: daysBefore(400) },
    ];
    expect(sortForReview(entries, NOW).map((e) => e.id)).toEqual([
      "overdue-oldest",
      "overdue-recent",
      "unverified",
      "current-old",
      "current-new",
    ]);
  });

  it("does not mutate the input", () => {
    const entries = [{ verified: true, lastVerifiedAt: daysBefore(1) }, { verified: false }];
    const copy = [...entries];
    sortForReview(entries, NOW);
    expect(entries).toEqual(copy);
  });
});

describe("canShowAsOfficial", () => {
  it("only labels a current, verified official source as official", () => {
    expect(canShowAsOfficial({ trustLevel: "official_verified", verified: true, lastVerifiedAt: "2026-09-25" }, NOW)).toBe(true);
    expect(canShowAsOfficial({ trustLevel: "official_verified", verified: false, lastVerifiedAt: "2026-09-25" }, NOW)).toBe(false);
    expect(canShowAsOfficial({ trustLevel: "official_verified", verified: true }, NOW)).toBe(false);
    expect(canShowAsOfficial({ trustLevel: "official_verified", verified: true, lastVerifiedAt: daysBefore(300) }, NOW)).toBe(false);
    expect(canShowAsOfficial({ trustLevel: "community_trusted", verified: true, lastVerifiedAt: "2026-09-25" }, NOW)).toBe(false);
  });
});
