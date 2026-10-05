import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import type { AgentFeedItem as Item } from "@/lib/agent/activity";
import type { Language } from "@/lib/i18n/dictionary";
import { FIELD } from "@/lib/i18n/field-notes";
import { fill } from "@/lib/i18n/experience";
import { dateLocale } from "@/lib/i18n/languages";
import { relativeTime } from "@/lib/agent/relative-time";

/** The demonstration label every demo item carries, in text (never color alone). */
export function DemoBadge({ language }: { language: Language }) {
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-ink/40 px-2.5 py-0.5 text-[0.72rem] font-extrabold text-slate">
      {FIELD.agent.demo[language]}
    </span>
  );
}

/**
 * One feed entry: the same fixed public text the case timeline shows for this step, who did it
 * (the AI or a moderator), when, and a link to the case.
 */
export function AgentFeedItem({
  item,
  officeName,
  now,
  language,
}: {
  item: Item;
  officeName: (contactId?: string) => string;
  now: Date;
  language: Language;
}) {
  const f = FIELD.caseView;
  const byAgent = item.kind !== "referral_approved" && item.kind !== "referral_declined";
  const Icon = byAgent ? Sparkles : ShieldCheck;
  return (
    <li className="border-b border-line">
      <Link
        href={`/cases/${item.caseNumber}`}
        className="grid grid-cols-[38px_minmax(0,1fr)_22px] items-start gap-3 px-1 py-4 transition-colors hover:bg-mint/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal md:gap-4"
      >
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-[38px] w-[38px] items-center justify-center rounded-full ${byAgent ? "bg-mint text-teal" : "bg-status-neutral text-ink"}`}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
        <span className="min-w-0">
          <span className="block font-bold text-ink">{fill(f.eventKinds[item.kind][language], { office: officeName(item.contactId) })}</span>
          {item.kind === "referral_approved" && (
            <span className="mt-0.5 block text-[0.88rem] text-ink/85">{FIELD.agent.referredWaiting[language]}</span>
          )}
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.79rem] text-slate">
            <span className="font-extrabold text-ink">{byAgent ? f.byAgent[language] : f.byModerator[language]}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{item.caseNumber}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={item.occurredAt} title={new Date(item.occurredAt).toLocaleString(dateLocale(language))}>
              {relativeTime(item.occurredAt, now, dateLocale(language))}
            </time>
            {item.isDemo && <DemoBadge language={language} />}
          </span>
        </span>
        <span className="mt-2 flex items-center">
          <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-slate" />
          <span className="sr-only">{FIELD.agent.viewCase[language]}</span>
        </span>
      </Link>
    </li>
  );
}
