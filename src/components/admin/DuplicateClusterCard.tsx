"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminMarkDuplicate } from "@/lib/store/admin-actions";
import type { Case } from "@/lib/schema/report";

/** `cases` must already be sorted oldest-first — the oldest is treated as the original. */
export function DuplicateClusterCard({
  cases,
  communityDisplayName,
  categoryLabel,
  areaLabel,
  score,
}: {
  cases: Case[];
  communityDisplayName: string;
  categoryLabel: string;
  areaLabel: string;
  score: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const original = cases[0];
  const others = cases.slice(1);

  return (
    <div className="rounded-lg border border-yellow/40 bg-yellow/10 p-3 text-sm">
      <p className="font-medium text-ink">
        {communityDisplayName} · {categoryLabel} · {areaLabel}{" "}
        <span className="text-xs text-slate">(similarity {Math.round(score * 100)}%)</span>
      </p>
      <ul className="mt-1 flex flex-col gap-1">
        {cases.map((c) => (
          <li key={c.id} className="text-ink/80">
            <span className="font-mono">{c.publicCaseNumber}</span>
            {c.id === original.id && <span className="ml-1 text-xs text-slate">(earliest)</span>}
            {" — "}
            {c.description.slice(0, 80)}
            {c.description.length > 80 ? "…" : ""}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        {others.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={pending === c.id}
            onClick={async () => {
              setPending(c.id);
              await adminMarkDuplicate(c.publicCaseNumber, original.publicCaseNumber);
              setPending(null);
              router.refresh();
            }}
            className="rounded-md border border-ink/15 bg-cream px-2 py-1 text-xs font-medium text-ink disabled:opacity-50"
          >
            Mark {c.publicCaseNumber} as duplicate of {original.publicCaseNumber}
          </button>
        ))}
      </div>
    </div>
  );
}
