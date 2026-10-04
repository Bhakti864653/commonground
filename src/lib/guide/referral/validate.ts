import { MAX_REFERRAL_MESSAGE_LENGTH, ReferralUrgencySchema } from "@/lib/schema/report";
import type { CommunityConfig } from "@/lib/schema/community";

export type ValidationResult = { valid: true } | { valid: false; reason: string };

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const URL = /https?:\/\/|www\./i;
/** Seven or more digits in a phone-like run ("6998-4809", "+507 935 2444"). */
const PHONE = /\+?\d[\d\s().-]{5,}\d/;

/**
 * The hard boundary for a referral message — whether the AI wrote it or a moderator edited it.
 * Pure and synchronous, like suggestion-validation.ts, so it runs identically on both paths and
 * is testable without an API key. It can't prove a message is free of personal data (a name is
 * just words), but it blocks the identifiers that can be detected, and a moderator reads every
 * message before it goes anywhere.
 */
export function validateReferralMessage(message: unknown, caseNumber: string): ValidationResult {
  if (typeof message !== "string" || message.trim().length === 0) {
    return { valid: false, reason: "The message is empty." };
  }
  if (message.length > MAX_REFERRAL_MESSAGE_LENGTH) {
    return { valid: false, reason: `The message is longer than ${MAX_REFERRAL_MESSAGE_LENGTH} characters.` };
  }
  if (!message.includes(caseNumber)) {
    return { valid: false, reason: "The message must mention the case number so the office can refer to it." };
  }
  // The case number itself is digit-heavy ("SV-2026-0005"), so check for phones without it.
  const withoutCaseNumber = message.split(caseNumber).join(" ");
  if (EMAIL.test(withoutCaseNumber)) return { valid: false, reason: "The message contains an email address." };
  if (URL.test(withoutCaseNumber)) return { valid: false, reason: "The message contains a link." };
  if (PHONE.test(withoutCaseNumber)) return { valid: false, reason: "The message contains a phone number." };
  return { valid: true };
}

export type Classification = {
  categoryAssessment: "confirmed" | "questioned";
  suggestedCategoryId?: string;
  urgency: "low" | "medium" | "high";
  reasoning: string;
};

/**
 * Normalizes the classifier's raw output against the real community config: an unknown urgency
 * is invalid, and a "questioned" category must name a different category the community actually
 * has — otherwise the doubt has nothing a moderator could act on, so it's treated as confirmed.
 */
export function normalizeClassification(
  raw: { categoryAssessment: string; suggestedCategoryId?: string; urgency: string; reasoning: string },
  community: CommunityConfig,
  currentCategoryId: string,
): Classification | null {
  const urgency = ReferralUrgencySchema.safeParse(raw.urgency);
  if (!urgency.success) return null;
  const suggested = raw.suggestedCategoryId;
  const questioned =
    raw.categoryAssessment === "questioned" &&
    suggested !== undefined &&
    suggested !== currentCategoryId &&
    community.categories.some((c) => c.id === suggested);
  return {
    categoryAssessment: questioned ? "questioned" : "confirmed",
    suggestedCategoryId: questioned ? suggested : undefined,
    urgency: urgency.data,
    reasoning: raw.reasoning,
  };
}
