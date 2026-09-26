import { describe, expect, it } from "vitest";
import { casePrefix, formatCaseNumber } from "@/lib/case-number/format-case-number";

describe("formatCaseNumber", () => {
  it("builds a prefix from each hyphenated segment's first letter", () => {
    expect(formatCaseNumber("santiago-veraguas", 2026, 1)).toBe("SV-2026-0001");
    expect(formatCaseNumber("riverbend-demo", 2026, 1)).toBe("RD-2026-0001");
  });

  it("zero-pads the sequence to 4 digits and doesn't truncate a larger one", () => {
    expect(formatCaseNumber("santiago-veraguas", 2026, 7)).toBe("SV-2026-0007");
    expect(formatCaseNumber("santiago-veraguas", 2026, 12345)).toBe("SV-2026-12345");
  });

  it("handles a single-segment community id", () => {
    expect(formatCaseNumber("riverbend", 2026, 3)).toBe("R-2026-0003");
  });
});

describe("casePrefix numeric segments", () => {
  it("keeps numbers whole so every '-n' suffix gives a distinct prefix", () => {
    expect(casePrefix("santiago-veraguas")).toBe("SV");
    expect(casePrefix("sudbury-canada-2")).toBe("SC2");
    expect(casePrefix("sudbury-canada-12")).toBe("SC12");
    expect(new Set(Array.from({ length: 50 }, (_, i) => casePrefix(`sudbury-canada-${i + 2}`))).size).toBe(50);
  });
});
