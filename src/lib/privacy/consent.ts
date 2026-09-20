import type { UserConsent } from "@/lib/schema/report";
import type { Language } from "@/lib/i18n/dictionary";

/** `now` is injectable so the recorded timestamp is testable without mocking global Date. */
export function buildConsentRecord(
  consentVersion: string,
  language: Language,
  now: () => string = () => new Date().toISOString(),
): UserConsent {
  return { consentVersion, consentedAt: now(), language };
}
