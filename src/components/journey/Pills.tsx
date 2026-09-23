import { BadgeCheck, CircleDashed, CircleHelp, CircleDot, FlaskConical, Hourglass, Users, CheckCheck, ArrowRightLeft, Ban } from "lucide-react";
import type { Language } from "@/lib/i18n/dictionary";
import { STATUS_LABELS, VERIFICATION_LABELS, type ReportStatus, type VerificationState } from "@/lib/schema/report";

const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium";

/** Status is always icon + text + color, never color alone (DESIGN_SYSTEM.md). */
const STATUS_STYLE: Record<ReportStatus, { className: string; Icon: typeof CircleDot }> = {
  received: { className: "bg-yellow text-on-yellow", Icon: CircleDot },
  under_review: { className: "bg-yellow text-on-yellow", Icon: Hourglass },
  in_discussion: { className: "bg-yellow text-on-yellow", Icon: Users },
  referred: { className: "bg-mint text-teal", Icon: ArrowRightLeft },
  in_progress: { className: "bg-mint text-teal", Icon: CircleDashed },
  updated: { className: "bg-mint text-teal", Icon: CheckCheck },
  closed: { className: "border border-ink/20 text-ink", Icon: CheckCheck },
  not_verifiable: { className: "border border-ink/20 text-slate", Icon: Ban },
};

export function StatusPill({ status, language }: { status: ReportStatus; language: Language }) {
  const { className, Icon } = STATUS_STYLE[status];
  return (
    <span className={`${base} ${className}`}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {STATUS_LABELS[status][language]}
    </span>
  );
}

const VERIFICATION_STYLE: Record<VerificationState, { className: string; Icon: typeof CircleDot }> = {
  officially_verified: { className: "bg-teal text-cream", Icon: BadgeCheck },
  community_report: { className: "border border-teal/40 text-teal", Icon: Users },
  needs_verification: { className: "border border-yellow bg-yellow/15 text-ink", Icon: CircleHelp },
  demonstration_data: { className: "border border-dashed border-ink/30 text-slate", Icon: FlaskConical },
};

export function VerificationPill({ state, language }: { state: VerificationState; language: Language }) {
  const { className, Icon } = VERIFICATION_STYLE[state];
  return (
    <span className={`${base} ${className}`}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {VERIFICATION_LABELS[state][language]}
    </span>
  );
}
