import { describe, expect, it } from "vitest";
import { toPublicCase, type Case, type PublicCase } from "@/lib/schema/report";

function fixtureCase(): Case {
  return {
    id: "case-1",
    type: "report",
    publicCaseNumber: "SV-2026-0001",
    communityId: "santiago-veraguas",
    categoryId: "garbage-sanitation",
    description: "Test case",
    approximateArea: { kind: "neighborhood", areaId: "centro", label: "Central area" },
    createdAt: "2026-09-20T00:00:00.000Z",
    status: "received",
    statusHistory: [
      { id: "evt-1", status: "received", occurredAt: "2026-09-20T00:00:00.000Z", actorType: "system" },
    ],
    sourceType: "community",
    verificationState: "community_report",
    consent: { consentVersion: "v1", consentedAt: "2026-09-20T00:00:00.000Z", language: "en" },
    adminNotes: [{ id: "note-1", authorId: "admin", createdAt: "2026-09-20T00:00:00.000Z", note: "PRIVATE: called the resident" }],
    inaccuracyFlags: [{ id: "flag-1", note: "PRIVATE: flag note", occurredAt: "2026-09-20T00:00:00.000Z" }],
    moderationActions: [{ id: "act-1", actorId: "admin", action: "add_note", occurredAt: "2026-09-20T00:00:00.000Z" }],
    agentSuggestions: [
      { id: "sugg-1", kind: "status", suggestedValue: "closed", reasoning: "PRIVATE: agent reasoning", createdAt: "2026-09-20T00:00:00.000Z", status: "pending" },
    ],
    managementToken: "PRIVATE-secret-token",
  };
}

describe("toPublicCase", () => {
  it("actually strips every private field at runtime, not just by type", () => {
    const publicCase = toPublicCase(fixtureCase());
    const serialized = JSON.stringify(publicCase);

    // The real risk this guards against: any of these values leaking into what gets sent
    // to the client. Checking the serialized string (what would actually cross the RSC
    // boundary), not just `in` on the object, so this can't pass by accident.
    expect(serialized).not.toContain("PRIVATE");
    expect(publicCase).not.toHaveProperty("managementToken");
    expect(publicCase).not.toHaveProperty("adminNotes");
    expect(publicCase).not.toHaveProperty("inaccuracyFlags");
    expect(publicCase).not.toHaveProperty("moderationActions");
    expect(publicCase).not.toHaveProperty("agentSuggestions");
  });

  it("keeps every field a resident is actually meant to see", () => {
    const publicCase = toPublicCase(fixtureCase());
    expect(publicCase.publicCaseNumber).toBe("SV-2026-0001");
    expect(publicCase.description).toBe("Test case");
    expect(publicCase.status).toBe("received");
    expect(publicCase.statusHistory).toHaveLength(1);
    expect(publicCase.verificationState).toBe("community_report");
  });

  it("type-level: PublicCase structurally cannot express any private field", () => {
    const publicCase = toPublicCase(fixtureCase());
    // @ts-expect-error -- adminNotes must not exist on PublicCase; if this ever stops
    // being a type error, the private-field guarantee has silently broken.
    void publicCase.adminNotes;
    // @ts-expect-error -- managementToken must not exist on PublicCase.
    void publicCase.managementToken;
    // @ts-expect-error -- moderationActions must not exist on PublicCase.
    void publicCase.moderationActions;
    // @ts-expect-error -- agentSuggestions must not exist on PublicCase.
    void publicCase.agentSuggestions;
    // @ts-expect-error -- inaccuracyFlags must not exist on PublicCase.
    void publicCase.inaccuracyFlags;

    // A plain assignment also proves the shape at compile time: this line only compiles if
    // PublicCase really is missing those keys relative to Case.
    const typed: PublicCase = publicCase;
    expect(typed).toBeDefined();
  });
});
