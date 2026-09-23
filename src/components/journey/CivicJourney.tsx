"use client";

import { Eye, FolderTree, BadgeCheck, UserCheck, Users } from "lucide-react";
import { EXPERIENCE } from "@/lib/i18n/experience";
import type { Language } from "@/lib/i18n/dictionary";

const STOP_ICONS = [Eye, FolderTree, BadgeCheck, UserCheck, Users];

/**
 * The five public stages as stops along one road: observation → organization → verification →
 * human review → shared action. It really is a sequence, which is why the stops are numbered.
 * The road draws itself once on load (the page's single orchestrated motion moment) and ends at
 * the same sunlit plaza as the logo. Reduced motion shows it already drawn.
 */
export function CivicJourney({ language }: { language: Language }) {
  const stops = EXPERIENCE.home.journey;
  // Stop centers in the 1000×220 drawing: alternating high/low along the road.
  const points: [number, number][] = [
    [100, 150],
    [300, 72],
    [500, 150],
    [700, 72],
    [900, 150],
  ];
  const road =
    "M-20 185 C 40 165, 60 150, 100 150 S 250 72, 300 72 S 450 150, 500 150 S 650 72, 700 72 S 850 150, 900 150 S 990 130, 1030 118";

  return (
    <div>
      {/* Wide screens: the road runs left to right with the copy under each stop. */}
      <div className="hidden md:block">
        <svg viewBox="0 0 1000 220" className="h-auto w-full overflow-visible" aria-hidden="true">
          <path d={road} fill="none" stroke="var(--sand)" strokeWidth="26" strokeLinecap="round" />
          <path
            d={road}
            fill="none"
            stroke="var(--teal)"
            strokeWidth="3"
            strokeDasharray="1400"
            strokeLinecap="round"
            className="cg-draw-path"
            style={{ ["--cg-path-length" as string]: "1400" }}
          />
          {points.map(([x, y], i) => {
            const last = i === points.length - 1;
            return (
              <g key={i} className="cg-arrive" style={{ animationDelay: `${0.25 + i * 0.3}s` }}>
                <circle cx={x} cy={y} r={last ? 30 : 24} fill={last ? "var(--yellow)" : "var(--surface)"} stroke="var(--teal)" strokeWidth="3" />
                <text
                  x={x}
                  y={y + 7}
                  textAnchor="middle"
                  fontSize="20"
                  fill={last ? "var(--on-yellow)" : "var(--teal)"}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
        <ol className="mt-4 grid grid-cols-5 gap-6">
          {stops.map((stop, i) => {
            const Icon = STOP_ICONS[i];
            return (
              <li key={stop.title.en} className="cg-arrive" style={{ animationDelay: `${0.35 + i * 0.3}s` }}>
                <h3 className="flex items-center gap-2 text-lg text-ink">
                  <Icon aria-hidden="true" className="h-4.5 w-4.5 shrink-0 text-teal" />
                  <span>
                    <span className="sr-only">{i + 1}. </span>
                    {stop.title[language]}
                  </span>
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate">{stop.body[language]}</p>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Narrow screens: the same road runs downward. */}
      <ol className="relative flex flex-col gap-7 pl-14 md:hidden">
        <span aria-hidden="true" className="absolute bottom-6 left-[1.3rem] top-6 w-2 rounded-full bg-sand" />
        <span aria-hidden="true" className="absolute bottom-6 left-[1.53rem] top-6 w-0.5 bg-teal" />
        {stops.map((stop, i) => {
          const last = i === stops.length - 1;
          return (
            <li key={stop.title.en} className="relative">
              <span
                aria-hidden="true"
                className={`absolute -left-14 top-0 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-teal font-heading text-lg ${
                  last ? "bg-yellow text-on-yellow" : "bg-surface text-teal"
                }`}
              >
                {i + 1}
              </span>
              <h3 className="text-lg text-ink">
                <span className="sr-only">{i + 1}. </span>
                {stop.title[language]}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate">{stop.body[language]}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
