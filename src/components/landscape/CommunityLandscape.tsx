"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion, useWebGLSupport } from "@/components/pulse/hooks";
import { useTheme } from "@/lib/theme/use-theme";
import { EXPERIENCE } from "@/lib/i18n/experience";
import type { Language } from "@/lib/i18n/dictionary";
import { areaPosition } from "@/lib/landscape/layout";
import { STATUS_LABELS, type PublicCase } from "@/lib/schema/report";
import type { AreaConfig, CommunityConfig } from "@/lib/schema/community";
import { LandscapeIllustration } from "./LandscapeIllustration";
import type { LandscapeArea } from "./LandscapeScene";

// Lazy-loaded so three.js never blocks first paint and never ships to pages without the
// landscape (3D_EXPERIENCE.md). The illustration underneath is what people see meanwhile.
const LandscapeScene = dynamic(() => import("./LandscapeScene").then((m) => m.LandscapeScene), {
  ssr: false,
  loading: () => null,
});

export function useLandscapeAreas(areas: AreaConfig[], cases: PublicCase[], language: Language): LandscapeArea[] {
  return useMemo(
    () =>
      areas.map((area, index) => ({
        area,
        center: areaPosition(area.id, index, areas.length),
        label: language === "es" ? area.labelEs : area.label,
        count: cases.filter((c) => c.approximateArea.areaId === area.id).length,
      })),
    [areas, cases, language],
  );
}

/**
 * The community's living landscape: interactive 3D when the device supports WebGL and the
 * visitor hasn't asked for reduced motion; otherwise the same town as an interactive flat
 * illustration. Either way, callers always render the case list alongside it — the landscape
 * is never the only way to reach a case.
 */
export function CommunityLandscape({
  community,
  cases,
  language,
  selectedAreaId,
  selectedCaseId,
  onSelectArea,
  onSelectCase,
  className,
}: {
  community: CommunityConfig;
  cases: PublicCase[];
  language: Language;
  selectedAreaId: string | null;
  selectedCaseId: string | null;
  onSelectArea: (areaId: string | null) => void;
  onSelectCase: (c: PublicCase | null) => void;
  className?: string;
}) {
  const webgl = useWebGLSupport();
  const reducedMotion = useReducedMotion();
  const { theme } = useTheme();
  const sceneTheme = theme === "dark" ? "dark" : "light";
  const areas = useLandscapeAreas(community.areas, cases, language);
  const t = EXPERIENCE.landscape;
  const canRender3D = webgl && !reducedMotion;

  const areaLabelById = new Map(areas.map((a) => [a.area.id, a.label]));
  const caseLabel = (c: PublicCase) => {
    const category = community.categories.find((cat) => cat.id === c.categoryId);
    const categoryLabel = (language === "es" ? category?.labelEs : category?.label) ?? "";
    const area = (c.approximateArea.areaId && areaLabelById.get(c.approximateArea.areaId)) || "";
    return `${EXPERIENCE.landscape.markerLegend[c.type][language]}: ${categoryLabel}, ${area}, ${STATUS_LABELS[c.status][language]}`;
  };

  const labels = {
    plaza: t.landmarks.plaza[language],
    hall: t.landmarks.hall[language],
    drainage: t.landmarks.drainage[language],
  };

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <LandscapeIllustration
        areas={areas}
        cases={cases}
        theme={sceneTheme}
        selectedAreaId={selectedAreaId}
        selectedCaseId={selectedCaseId}
        onSelectArea={onSelectArea}
        onSelectCase={onSelectCase}
        interactive={!canRender3D}
        caseLabel={caseLabel}
        labels={labels}
        className="absolute inset-0 h-full w-full"
      />
      {canRender3D && (
        <div className="absolute inset-0">
          <LandscapeScene
            areas={areas}
            cases={cases}
            theme={sceneTheme}
            selectedAreaId={selectedAreaId}
            selectedCaseId={selectedCaseId}
            onSelectArea={onSelectArea}
            onSelectCase={onSelectCase}
            labels={labels}
          />
        </div>
      )}
      <p className="sr-only">{canRender3D ? t.controlsHint[language] : t.listFallback[language]}</p>
    </div>
  );
}
