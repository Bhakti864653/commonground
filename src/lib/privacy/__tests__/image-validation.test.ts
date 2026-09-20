import { describe, expect, it } from "vitest";
import { validateImageMetadata } from "@/lib/privacy/image-validation";

describe("validateImageMetadata", () => {
  it("accepts an allowed type within the size limit", () => {
    expect(validateImageMetadata({ mimeType: "image/jpeg", sizeBytes: 1024 })).toEqual({
      valid: true,
    });
  });

  it("rejects a disallowed MIME type", () => {
    expect(validateImageMetadata({ mimeType: "application/pdf", sizeBytes: 1024 })).toEqual({
      valid: false,
      reason: "type",
    });
  });

  it("rejects a file over the size limit", () => {
    expect(
      validateImageMetadata({ mimeType: "image/png", sizeBytes: 11 * 1024 * 1024 }),
    ).toEqual({ valid: false, reason: "size" });
  });

  it("rejects a zero or negative size", () => {
    expect(validateImageMetadata({ mimeType: "image/png", sizeBytes: 0 })).toEqual({
      valid: false,
      reason: "size",
    });
  });
});
