import { BadgeCheck, CircleHelp, FlaskConical, Users } from "lucide-react";
import type { Language } from "@/lib/i18n/dictionary";
import { STATUS_LABELS, VERIFICATION_LABELS, type ReportStatus, type VerificationState } from "@/lib/schema/report";

const pill = "inline-flex w-max items-center gap-1.5 rounded-full px-3 py-[7px] text-[0.72rem] font-extrabold text-ink";

/** Soft status tints from the reference. The label is always written out — color is a bonus. */
export const STATUS_TONE: Record<ReportStatus, "review" | "progress" | "resolved" | "neutral"> = {
  received: "review",
  under_review: "review",
  in_discussion: "review",
  referred: "progress",
  in_progress: "progress",
  updated: "resolved",
  closed: "resolved",
  not_verifiable: "neutral",
};

const TONE_CLASS = {
  review: "bg-status-review",
  progress: "bg-status-progress",
  resolved: "bg-status-resolved",
  neutral: "bg-status-neutral",
} as const;

export function StatusPill({ status, language }: { status: ReportStatus; language: Language }) {
  return <span className={`${pill} ${TONE_CLASS[STATUS_TONE[status]]}`}>{STATUS_LABELS[status][language]}</span>;
}

const VERIFICATION_ICON: Record<VerificationState, typeof Users> = {
  officially_verified: BadgeCheck,
  community_report: Users,
  needs_verification: CircleHelp,
  demonstration_data: FlaskConical,
};

/** Verification is a separate question from status, so it gets an outlined pill with an icon. */
export function VerificationPill({ state, language }: { state: VerificationState; language: Language }) {
  const Icon = VERIFICATION_ICON[state];
  return (
    <span
      className={`${pill} border ${
        state === "officially_verified" ? "border-teal bg-mint" : state === "demonstration_data" ? "border-dashed border-ink/35" : "border-line bg-surface"
      }`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {VERIFICATION_LABELS[state][language]}
    </span>
  );
}
