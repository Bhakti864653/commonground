"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion, useWebGLSupport } from "./hooks";
import { PulseCaseDrawer } from "./PulseCaseDrawer";
import { CaseList } from "@/components/dashboard/CaseList";
import { UI_STRINGS, type Language } from "@/lib/i18n/dictionary";
import type { Case } from "@/lib/schema/report";
import type { CommunityConfig } from "@/lib/schema/community";

// Lazy-loaded so the three.js chunk never ships to a page that doesn't render this view
// (3D_EXPERIENCE.md: lazy-load, never block initial page load).
const CommunityPulseScene = dynamic(
  () => import("./CommunityPulseScene").then((m) => m.CommunityPulseScene),
  { ssr: false },
);

export function CommunityPulse({
  cases,
  community,
  language,
  emptyMessage,
  onViewAsList,
}: {
  cases: Case[];
  community: CommunityConfig;
  language: Language;
  emptyMessage: string;
  onViewAsList: () => void;
}) {
  const webglSupported = useWebGLSupport();
  const reducedMotion = useReducedMotion();
  const [selected, setSelected] = useState<Case | null>(null);
  const t = UI_STRINGS.pulse;

  const canRender3D = webglSupported && !reducedMotion;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate">{t.disclaimer[language]}</p>

      {!canRender3D && <p className="text-xs text-slate">{t.unavailable[language]}</p>}

      {canRender3D ? (
        <>
          <button
            type="button"
            onClick={onViewAsList}
            className="self-start text-xs font-medium text-teal underline"
          >
            {t.viewAsList[language]}
          </button>
          {/* Outer div carries the fixed layout size; inner is the Canvas's own `relative`
              anchor — kept separate so a caller's own positioning className never collides
              with the one this component needs internally. */}
          <div className="h-[22rem] w-full overflow-hidden rounded-lg border border-ink/10">
            <div className="relative h-full w-full">
              <CommunityPulseScene
                cases={cases}
                areas={community.areas}
                onSelect={setSelected}
              />
            </div>
          </div>
        </>
      ) : (
        <CaseList
          cases={cases}
          community={community}
          language={language}
          emptyMessage={emptyMessage}
        />
      )}

      {selected && (
        <PulseCaseDrawer
          caseItem={selected}
          category={
            community.categories.find((c) => c.id === selected.categoryId) ??
            community.categories[0]
          }
          language={language}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
