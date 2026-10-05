import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { PendingReferral } from "@/lib/agent/actions";
import type { Language } from "@/lib/i18n/dictionary";
import { FIELD } from "@/lib/i18n/field-notes";
import { fill } from "@/lib/i18n/experience";
import { dateLocale } from "@/lib/i18n/languages";
import { relativeTime } from "@/lib/agent/relative-time";
import { DemoBadge } from "./AgentFeedItem";

/**
 * Moderators only: referrals waiting on /admin. The page renders this only when the server sent
 * a list, which it does only for a visitor with the admin cookie.
 */
export function PendingReferrals({
  pending,
  officeName,
  now,
  language,
}: {
  pending: PendingReferral[];
  officeName: (contactId?: string) => string;
  now: Date;
  language: Language;
}) {
  const t = FIELD.agent;
  return (
    <section aria-labelledby="agent-pending" className="mt-10 rounded-[22px] border-2 border-ink/80 bg-surface p-5 md:p-7">
      <h2 id="agent-pending" className="flex items-center gap-2 font-sans text-xl font-extrabold tracking-normal text-ink">
        <ShieldCheck aria-hidden="true" className="h-5 w-5" />
        {t.pendingTitle[language]}
      </h2>
      <p className="mt-1 text-[0.9rem] text-slate">{t.pendingSub[language]}</p>
      {pending.length === 0 ? (
        <p className="mt-4 text-ink">{t.pendingEmpty[language]}</p>
      ) : (
        <ul className="mt-4 flex flex-col">
          {pending.map((p) => (
            <li key={p.caseNumber} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line py-3">
              <span className="font-bold tabular-nums text-ink">{p.caseNumber}</span>
              <span className="text-ink/85">{fill(t.pendingItem[language], { office: officeName(p.contactId) })}</span>
              <time dateTime={p.preparedAt} className="text-[0.82rem] text-slate">
                {relativeTime(p.preparedAt, now, dateLocale(language))}
              </time>
              {p.isDemo && <DemoBadge language={language} />}
              <Link
                href={`/admin/cases/${p.caseNumber}`}
                className="ml-auto rounded-full bg-ink px-4 py-1.5 text-[0.82rem] font-extrabold text-paper hover:bg-ink/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
              >
                {t.review[language]}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
