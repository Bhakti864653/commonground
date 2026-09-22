"use client";

import { useState } from "react";
import { generateBriefingAction } from "@/lib/guide/admin-actions";
import type { CommunityBriefing } from "@/lib/guide/briefing";

const KIND_LABELS: Record<CommunityBriefing["items"][number]["kind"], string> = {
  pattern: "Pattern",
  duplicate: "Possible duplicate",
  stale: "Stale case",
  other: "Other",
};

/**
 * Deliberately on-demand (a button, not a poller) — matches the same honesty as the rule-based
 * duplicate-clusters/trends sections about there being no real background scheduler in this
 * serverless app.
 */
export function BriefingPanel({
  communityId,
  communityDisplayName,
}: {
  communityId: string;
  communityDisplayName: string;
}) {
  const [briefing, setBriefing] = useState<CommunityBriefing | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const result = await generateBriefingAction(communityId);
    setBriefing(result);
    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-teal/30 bg-mint/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{communityDisplayName} briefing</h3>
          <p className="text-xs text-slate">
            On-demand, AI-reasoned over the current case load — never changes anything itself.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={generate}
          className="shrink-0 rounded-md border border-teal/40 px-3 py-1.5 text-sm font-medium text-teal disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate briefing"}
        </button>
      </div>
      {briefing &&
        (briefing.items.length === 0 ? (
          <p className="mt-2 text-sm text-slate">Nothing notable right now.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {briefing.items.map((item, i) => (
              <li key={i} className="rounded-md border border-ink/10 bg-cream p-2 text-sm">
                <p>
                  <span className="font-medium text-ink">{KIND_LABELS[item.kind]}</span>
                  {item.caseNumbers.length > 0 && (
                    <span className="ml-1 text-xs text-slate">({item.caseNumbers.join(", ")})</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-ink/70">{item.note}</p>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
