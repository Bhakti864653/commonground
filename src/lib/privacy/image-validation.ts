/**
 * PRIVACY.md's "Security baseline": "Uploads are validated (type/size)." Never trust the
 * client-side check alone — `createCase` (case-store.ts) runs this again server-side, since a
 * client could call the server action directly with fabricated metadata, bypassing the wizard
 * UI entirely.
 */
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export type ImageValidationResult =
  | { valid: true }
  | { valid: false; reason: "type" | "size" };

export function validateImageMetadata(image: {
  mimeType: string;
  sizeBytes: number;
}): ImageValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(image.mimeType)) {
    return { valid: false, reason: "type" };
  }
  if (image.sizeBytes <= 0 || image.sizeBytes > MAX_SIZE_BYTES) {
    return { valid: false, reason: "size" };
  }
  return { valid: true };
}
