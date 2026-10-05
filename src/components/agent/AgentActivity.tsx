"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listAgentActivity, listPendingReferrals, type AgentActivityPage, type PendingReferral } from "@/lib/agent/actions";
import type { Language } from "@/lib/i18n/dictionary";
import { FIELD } from "@/lib/i18n/field-notes";
import { fill } from "@/lib/i18n/experience";
import { labelOf } from "@/lib/i18n/labels";
import { CasesLoadError } from "@/components/journey/CasesLoadError";
import { AgentFeedItem } from "./AgentFeedItem";
import { PendingReferrals } from "./PendingReferrals";

/**
 * Counts, the moderator-only pending list, and the feed for one community. Mounted with the
 * community id as its key, so switching community starts again from a clean slate.
 */
export function AgentActivity({
  communityId,
  communityName,
  language,
}: {
  communityId: string;
  communityName: string;
  language: Language;
}) {
  const t = FIELD.agent;
  const [page, setPage] = useState<AgentActivityPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pending, setPending] = useState<PendingReferral[] | null>(null);
  // Fixed per load, so every "hace 5 min" in the list is measured from the same moment.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    listAgentActivity(communityId, 0)
      .then((result) => {
        if (cancelled) return;
        setPage(result);
        setNow(new Date());
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    // Moderators only: anyone else gets null from the server, and the section never renders.
    listPendingReferrals(communityId)
      .then((result) => {
        if (!cancelled) setPending(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [communityId]);

  const loadMore = () => {
    if (!page) return;
    setLoadingMore(true);
    listAgentActivity(communityId, page.items.length)
      .then((more) => {
        setPage((current) => {
          if (!current) return more;
          const seen = new Set(current.items.map((i) => i.id));
          return { ...more, items: [...current.items, ...more.items.filter((i) => !seen.has(i.id))] };
        });
      })
      .catch(() => setFailed(true))
      .finally(() => setLoadingMore(false));
  };

  const officeName = (contactId?: string) => {
    const office = page?.offices.find((o) => o.id === contactId);
    return office ? labelOf({ label: office.name, labelEs: office.nameEs, labels: office.labels }, language) : FIELD.caseView.officeFallback[language];
  };

  if (failed) return <CasesLoadError language={language} message={t.loadError[language]} />;
  if (!page) {
    return (
      <p role="status" className="border-t border-[#9faf9d] py-9 text-slate">
        {t.loading[language]}
      </p>
    );
  }

  const counts = [
    { key: "reviewed", value: page.counts.reviewed, label: t.counts.reviewed[language] },
    { key: "prepared", value: page.counts.prepared, label: t.counts.prepared[language] },
    { key: "approved", value: page.counts.approved, label: t.counts.approved[language] },
  ];

  return (
    <div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {counts.map((c) => (
          <div key={c.key} className="rounded-[20px] border border-line bg-surface p-5">
            <dt className="text-[0.85rem] font-bold text-slate">{c.label}</dt>
            <dd className="mt-1 font-heading text-[2.6rem] leading-none tracking-[-0.05em] text-ink tabular-nums">{c.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[0.88rem] text-slate">{t.countsNote[language]}</p>

      {pending && <PendingReferrals pending={pending} officeName={officeName} now={now} language={language} />}

      <section aria-labelledby="agent-feed" className="mt-10">
        <h2 id="agent-feed" className="text-[clamp(2rem,3.2vw,2.8rem)] text-ink">
          {t.feedTitle[language]}
        </h2>
        <p className="mt-1 text-slate">{fill(t.feedSub[language], { community: communityName })}</p>

        {page.total === 0 ? (
          <div className="mt-6 flex flex-col items-start gap-3 border-t border-[#9faf9d] py-9">
            <p className="font-bold text-ink">{t.emptyTitle[language]}</p>
            <p className="text-slate">{t.emptyBody[language]}</p>
            <Link
              href="/report/new"
              className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-[0.9rem] font-extrabold text-ink hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {t.emptyCta[language]}
            </Link>
          </div>
        ) : (
          <>
            <ol className="mt-5 border-t border-[#9faf9d]">
              {page.items.map((item) => (
                <AgentFeedItem key={item.id} item={item} officeName={officeName} now={now} language={language} />
              ))}
            </ol>
            {page.items.length < page.total && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="mt-5 rounded-full border border-line px-5 py-2.5 text-[0.88rem] font-extrabold text-ink hover:bg-mint disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
              >
                {loadingMore ? t.loading[language] : t.loadMore[language]}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
