import { describe, expect, it } from "vitest";
import { draftStatusChangeExplanation } from "@/lib/insights/status-explanation";

describe("draftStatusChangeExplanation", () => {
  it("returns the plain template when there's no moderator note", () => {
    expect(draftStatusChangeExplanation("under_review", "en")).toBe(
      "The moderation team is reviewing this case.",
    );
  });

  it("appends the moderator's own note verbatim, never rewriting it", () => {
    const result = draftStatusChangeExplanation(
      "closed",
      "en",
      "Confirmed fixed by the water utility on 9/19.",
    );
    expect(result).toBe(
      "This case has been closed. Confirmed fixed by the water utility on 9/19.",
    );
  });

  it("has a template for every real status, in both languages", () => {
    const statuses: Array<Parameters<typeof draftStatusChangeExplanation>[0]> = [
      "received",
      "under_review",
      "in_discussion",
      "referred",
      "in_progress",
      "updated",
      "closed",
      "not_verifiable",
    ];
    for (const status of statuses) {
      expect(draftStatusChangeExplanation(status, "en")).toBeTruthy();
      expect(draftStatusChangeExplanation(status, "es")).toBeTruthy();
    }
  });

  it("ignores a whitespace-only note", () => {
    expect(draftStatusChangeExplanation("received", "en", "   ")).toBe(
      "Your submission was received and is in the queue for review.",
    );
  });
});
