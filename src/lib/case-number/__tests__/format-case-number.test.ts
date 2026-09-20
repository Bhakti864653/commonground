import { describe, expect, it } from "vitest";
import { formatCaseNumber } from "@/lib/case-number/format-case-number";

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
