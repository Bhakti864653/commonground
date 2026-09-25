"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FIELD } from "@/lib/i18n/field-notes";
import type { Language } from "@/lib/i18n/dictionary";
import { formatApproximateAreaLabel } from "@/lib/privacy/approximate-area";
import { STATUS_LABELS, type PublicCase } from "@/lib/schema/report";
import type { CommunityConfig } from "@/lib/schema/community";
import { fill } from "@/lib/i18n/experience";
import { mapAreaPosition, mapPinPosition } from "@/lib/map/positions";
import { labelOf } from "@/lib/i18n/labels";
import { CasePin } from "./CasePin";
import { MapCredit, StreetMap, casesOffStreetMap } from "./StreetMap";

/**
 * The community view. A community with map settings gets a real street map, where each
 * compass area is a soft zone holding its cases' numbered markers. Any other community (such as
 * the fictional demo), or a browser that can't draw the map, gets the illustrative map, where
 * pins are placed only by approximate area plus a stable offset. Either way no case is ever
 * placed at a real location, and pin numbers match the numbered case rows below.
 */
export function CommunityMap({
  community,
  cases,
  selectedId,
  onSelect,
  language,
}: {
  community: CommunityConfig;
  cases: PublicCase[];
  selectedId: string | null;
  onSelect: (c: PublicCase) => void;
  language: Language;
}) {
  const t = FIELD.home;
  const selected = cases.find((c) => c.id === selectedId) ?? cases[0] ?? null;
  const selectedIndex = selected ? cases.indexOf(selected) : -1;
  const category = selected ? community.categories.find((c) => c.id === selected.categoryId) : undefined;
  const [streetMapFailed, setStreetMapFailed] = useState(false);
  const street = community.map && !streetMapFailed ? community.map : null;
  const offMap = street ? casesOffStreetMap(cases, community) : [];

  return (
    // The field-note card overlays the map from tablet width up; on phones it sits below the
    // map instead, so it never covers pins a resident needs to tap.
    <div className="relative">
      <div className="relative isolate min-h-[465px] overflow-hidden rounded-[24px] bg-map md:min-h-[540px] md:rounded-[34px] min-[1100px]:h-full">
        {street ? (
          <StreetMap
            community={community}
            settings={street}
            cases={cases}
            selectedId={selected?.id ?? null}
            onSelect={onSelect}
            onUnavailable={() => setStreetMapFailed(true)}
            language={language}
          />
        ) : (
          <MapArt />
        )}

        {/* The heading floats over the map without blocking drags beneath it. */}
        <div className="pointer-events-none absolute inset-x-5 top-5 z-[2] flex items-start justify-between gap-3 md:inset-x-[30px] md:top-7">
          <div>
            <p className="cg-caps text-map-text">{t.mapCaps[language]}</p>
            <h3 className="mb-0.5 mt-2 text-[2rem] tracking-[-0.05em] text-ink md:text-[2.6rem]">{community.displayName}</h3>
            <p className="text-[0.83rem] font-bold text-map-text">{t.mapSub[language]}</p>
            {street && <MapCredit language={language} />}
          </div>
          <p className="hidden shrink-0 rounded-full bg-surface/90 px-4 py-[11px] text-[0.66rem] font-extrabold uppercase tracking-[0.09em] text-ink backdrop-blur min-[420px]:block">
            {fill(t.mapCount[language], { count: String(cases.length).padStart(2, "0") })}
          </p>
        </div>

        {!street &&
          community.areas.map((area, i) => {
            const [x, y] = mapAreaPosition(area.id, i, community.areas.length);
            return (
              <span
                key={area.id}
                aria-hidden="true"
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute z-[1] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[0.7rem] font-bold uppercase tracking-[0.16em] text-map-text/80"
              >
                {labelOf(area, language)}
              </span>
            );
          })}

        {cases.length === 0 && (
          <p className="pointer-events-none absolute inset-x-6 top-1/2 z-[2] -translate-y-1/2 text-center font-heading text-2xl text-ink">{t.mapEmpty[language]}</p>
        )}

        {!street &&
          cases.map((c, i) => {
            const areaId = c.approximateArea.areaId ?? null;
            const areaIndex = community.areas.findIndex((a) => a.id === areaId);
            const orderInArea = cases.slice(0, i).filter((other) => (other.approximateArea.areaId ?? null) === areaId).length;
            const [x, y] = mapPinPosition(areaId, areaIndex, community.areas.length, orderInArea);
            return (
              <CasePin
                key={c.id}
                c={c}
                index={i}
                selected={selected?.id === c.id}
                onSelect={onSelect}
                language={language}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute z-[3] -translate-x-1/2 -translate-y-1/2"
              />
            );
          })}

        {/* Every pin color is named here — and each pin's own label spells out its status. */}
        <div className="absolute bottom-2.5 left-2.5 z-[2] flex max-w-[calc(100%-1.25rem)] flex-col gap-2 rounded-[18px] bg-surface/90 px-[15px] py-2.5 text-[0.7rem] font-extrabold text-ink md:bottom-5 md:left-5 md:max-w-[55%]">
          {offMap.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1">{t.offMap[language]}</span>
              {offMap.map(({ c, i }) => (
                <CasePin key={c.id} c={c} index={i} selected={selected?.id === c.id} onSelect={onSelect} language={language} size="sm" />
              ))}
            </div>
          )}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-pin-review" aria-hidden="true" />
              {t.legendReview[language]}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-pin-progress" aria-hidden="true" />
              {t.legendProgress[language]}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#172b25] ring-1 ring-ink/50" aria-hidden="true" />
              {t.legendCase[language]}
            </span>
          </p>
        </div>

      </div>
      {selected && (
        <Link
          href={`/cases/${selected.publicCaseNumber}`}
          className="cg-arrive relative z-[4] mt-3 grid gap-2 rounded-[21px] bg-surface p-4 text-left text-ink shadow-[0_16px_40px_#183b3030] transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal md:absolute md:bottom-5 md:right-5 md:mt-0 md:w-[clamp(210px,31%,280px)] md:gap-2.5 md:bg-surface/95 md:p-5 md:shadow-[0_16px_40px_#183b3050] md:backdrop-blur-md"
          key={selected.id}
        >
          <span className="flex items-center justify-between text-[0.64rem] font-black uppercase tracking-[0.12em] text-caps">
            <span>
              {String(selectedIndex + 1).padStart(2, "0")} / {t.fieldNote[language]}
            </span>
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </span>
          <strong className="line-clamp-3 font-heading text-[1.18rem] font-normal leading-[1.05] tracking-[-0.05em] md:text-[1.45rem]">
            {selected.description}
          </strong>
          <span className="text-[0.73rem] font-extrabold text-slate">
            <span className="tabular-nums">{selected.publicCaseNumber}</span> · {formatApproximateAreaLabel(selected.approximateArea, language)} ·{" "}
            {STATUS_LABELS[selected.status][language]}
            {category ? ` · ${labelOf(category, language)}` : ""}
          </span>
        </Link>
      )}
    </div>
  );
}

/** Decorative streets, water, and green spaces — no real geography. */
function MapArt() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path
        d="M0 180 C125 145 173 214 296 171 S504 109 800 147 M0 375 C131 326 189 390 332 325 S579 319 800 289"
        fill="none"
        stroke="var(--map-road)"
        strokeWidth="34"
      />
      <path
        d="M-30 90 C116 123 189 52 315 106 S565 227 832 186 M69 -25 C151 164 101 339 150 509 M401 -35 C332 183 487 358 412 505 M680 -28 C608 136 700 322 654 515"
        fill="none"
        stroke="var(--map-road)"
        strokeWidth="14"
        opacity="0.8"
      />
      <path d="M-20 267 C133 240 150 277 237 286 S412 233 531 252 S690 386 830 338" fill="none" stroke="var(--map-park)" strokeWidth="6" strokeDasharray="2 11" />
      <path d="M216 0 Q263 81 217 123 T289 265 Q283 365 223 480" fill="none" stroke="var(--map-water)" strokeWidth="27" opacity="0.68" />
      <path d="M510 0 Q573 93 543 152 T601 365 Q585 424 617 480" fill="none" stroke="var(--map-water)" strokeWidth="14" opacity="0.5" />
      <g fill="var(--map-park)">
        <ellipse cx="81" cy="89" rx="56" ry="25" />
        <ellipse cx="721" cy="400" rx="91" ry="35" />
        <ellipse cx="369" cy="421" rx="55" ry="23" />
      </g>
    </svg>
  );
}
