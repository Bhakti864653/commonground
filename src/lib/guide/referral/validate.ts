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
export function validateReferralMessage(message: unknown, caseNumber: string, caseUrl?: string): ValidationResult {
  if (typeof message !== "string" || message.trim().length === 0) {
    return { valid: false, reason: "The message is empty." };
  }
  if (message.length > MAX_REFERRAL_MESSAGE_LENGTH) {
    return { valid: false, reason: `The message is longer than ${MAX_REFERRAL_MESSAGE_LENGTH} characters.` };
  }
  if (!message.includes(caseNumber)) {
    return { valid: false, reason: "The message must mention the case number so the office can refer to it." };
  }
  // The case's own public page is the one link allowed, and the case number itself is
  // digit-heavy ("SV-2026-0005") — remove both before looking for links and phone numbers.
  const withoutAllowed = caseUrl ? message.split(caseUrl).join(" ") : message;
  const withoutCaseNumber = withoutAllowed.split(caseNumber).join(" ");
  if (EMAIL.test(withoutCaseNumber)) return { valid: false, reason: "The message contains an email address." };
  if (URL.test(withoutCaseNumber)) return { valid: false, reason: "The message contains a link." };
  if (PHONE.test(withoutCaseNumber)) return { valid: false, reason: "The message contains a phone number." };
  return { valid: true };
}

export type Classification = {
  categoryAssessment: "confirmed" | "questioned";
  suggestedCategoryId?: string;
  urgency: "low" | "medium" | "high";
  urgencyReason: string;
  reasoning: string;
};

/**
 * Normalizes the classifier's raw output against the real community config: an unknown urgency
 * is invalid, and a "questioned" category must name a different category the community actually
 * has — otherwise the doubt has nothing a moderator could act on, so it's treated as confirmed.
 */
export function normalizeClassification(
  raw: { categoryAssessment: string; suggestedCategoryId?: string; urgency: string; urgencyReason?: string; reasoning: string },
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
    urgencyReason: raw.urgencyReason?.trim() || "No reason given.",
    reasoning: raw.reasoning,
  };
}

const SIGNATURE = "Equipo de moderación de CommonGround";

/**
 * Adds the report date and the case's public link to a drafted message — written by code, not
 * the model, so they are always exact. They go just above the signature when there is one.
 */
export function addCaseReference(message: string, reportedOn: string, caseUrl: string): string {
  const reference = `Fecha del reporte: ${reportedOn}\nCaso público: ${caseUrl}`;
  const at = message.lastIndexOf(SIGNATURE);
  if (at === -1) return `${message.trimEnd()}\n\n${reference}`;
  return `${message.slice(0, at).trimEnd()}\n\n${reference}\n\n${message.slice(at)}`;
}

/** "4 de octubre de 2026" — the date a case was reported, in Panama's time zone. */
export function formatReportDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Panama",
  });
}
