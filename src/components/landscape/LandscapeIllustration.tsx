"use client";

import { ISLAND_RADIUS, UNASSIGNED_POSITION, markerPosition, neighborhoodFor, round2, toSvg, type Vec2 } from "@/lib/landscape/layout";
import { markerColorForCase } from "@/lib/pulse/marker-color";
import type { PublicCase } from "@/lib/schema/report";
import type { Theme } from "@/lib/theme/theme";
import type { LandscapeArea } from "./LandscapeScene";

const SIZE = 400;

/** The same organic parcel as the 3D island, traced as an SVG path. */
function islandPath(): string {
  const steps = 64;
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = ISLAND_RADIUS * (1 + 0.06 * Math.sin(a * 3 + 0.6) + 0.035 * Math.cos(a * 5 + 1.3));
    // The 3D shape is drawn in XY and rotated flat, which mirrors its y into -z.
    const [x, y] = toSvg([Math.cos(a) * r, -Math.sin(a) * r], SIZE);
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `${points.join(" ")} Z`;
}

const ISLAND_PATH = islandPath();

function drainagePath(): string {
  const pts: Vec2[] = [
    [-8.6, -3.4],
    [-5.2, -2.2],
    [-2.8, -3.3],
    [1.6, -2.4],
    [3.2, 1.8],
    [2.4, 3.6],
    [3.9, 7.8],
  ];
  const svg = pts.map((p) => toSvg(p, SIZE));
  let d = `M${svg[0][0]} ${svg[0][1]}`;
  for (let i = 1; i < svg.length; i++) {
    const [px, py] = svg[i - 1];
    const [x, y] = svg[i];
    d += ` Q${round2(px + (x - px) * 0.5 + (y - py) * 0.15)} ${round2(py + (y - py) * 0.5 - (x - px) * 0.15)} ${x} ${y}`;
  }
  return d;
}

const DRAINAGE_PATH = drainagePath();

/**
 * A flat, illustrated map of the same town the 3D scene builds — shown while the 3D view loads,
 * and as the complete, still-interactive fallback when WebGL is unavailable or the visitor
 * prefers reduced motion. Areas and markers are real keyboard-operable buttons.
 */
export function LandscapeIllustration({
  areas,
  cases,
  theme,
  selectedAreaId,
  selectedCaseId,
  onSelectArea,
  onSelectCase,
  interactive,
  caseLabel,
  labels,
  className,
}: {
  areas: LandscapeArea[];
  cases: PublicCase[];
  theme: Theme;
  selectedAreaId: string | null;
  selectedCaseId: string | null;
  onSelectArea?: (areaId: string | null) => void;
  onSelectCase?: (c: PublicCase) => void;
  interactive: boolean;
  caseLabel: (c: PublicCase) => string;
  labels: { plaza: string; hall: string; drainage: string };
  className?: string;
}) {
  const centerById = new Map(areas.map((a) => [a.area.id, a.center]));
  const [cx, cy] = toSvg([0, 0], SIZE);

  return (
    <svg viewBox={`0 20 ${SIZE} ${SIZE - 40}`} className={className} role="group" aria-label={labels.plaza}>
      <path d={ISLAND_PATH} fill="var(--meadow)" stroke="var(--sand)" strokeWidth="6" />
      <path d={DRAINAGE_PATH} fill="none" stroke="var(--turquoise)" strokeWidth="7" strokeLinecap="round" opacity="0.85">
        <title>{labels.drainage}</title>
      </path>

      {areas
        .filter((a) => a.area.id !== "centro")
        .map((a, i) => {
          const [x, y] = toSvg(a.center, SIZE);
          const bend = i % 2 === 0 ? 0.12 : -0.12;
          const mx = round2((cx + x) / 2 - (y - cy) * bend);
          const my = round2((cy + y) / 2 + (x - cx) * bend);
          return (
            <path
              key={a.area.id}
              d={`M${cx} ${cy} Q${mx} ${my} ${x} ${y}`}
              fill="none"
              stroke="var(--sand)"
              strokeWidth="11"
              strokeLinecap="round"
            />
          );
        })}

      {areas.map((a) => {
        const { houses, trees } = neighborhoodFor(a.area.id, a.center, a.area.id === "centro" ? 0 : 7);
        return (
          <g key={a.area.id} aria-hidden="true">
            {trees.map((t, i) => {
              const [x, y] = toSvg(t.position, SIZE);
              return <circle key={`t${i}`} cx={x} cy={y} r={round2(5 * t.scale)} fill="var(--forest)" opacity="0.75" />;
            })}
            {houses.map((h, i) => {
              const [x, y] = toSvg(h.position, SIZE);
              return (
                <g key={`h${i}`} transform={`translate(${x} ${y}) rotate(${round2((-h.rotation * 180) / Math.PI)}) scale(${round2(h.scale)})`}>
                  <rect x="-6" y="-5" width="12" height="10" rx="1.5" fill="var(--surface)" stroke="var(--slate)" strokeOpacity="0.35" />
                  <path d="M-7 -5 L0 -10 L7 -5 Z" fill={h.tone === 2 ? "var(--yellow)" : h.tone === 1 ? "var(--teal)" : "var(--forest)"} />
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Plaza and community hall */}
      <circle cx={cx} cy={cy} r="20" fill="var(--sand)" />
      <circle cx={cx} cy={cy} r="7" fill="var(--yellow)" />
      {(() => {
        const [hx, hy] = toSvg([1.9, -1.45], SIZE);
        return <rect x={hx - 14} y={hy - 8} width="28" height="16" rx="2" fill="var(--surface)" stroke="var(--teal)" strokeWidth="2" aria-hidden="true" />;
      })()}

      {areas.map((a) => {
        const [x, y] = toSvg(a.center, SIZE);
        const r = a.area.id === "centro" ? 30 : 50;
        const selected = selectedAreaId === a.area.id;
        const labelY = a.area.id === "centro" ? y + 44 : a.center[1] < 0 ? y - r - 8 : y + r + 16;
        return (
          <g key={a.area.id}>
            <circle
              cx={x}
              cy={y}
              r={r}
              fill="var(--teal)"
              fillOpacity={selected ? 0.22 : 0.07}
              stroke="var(--teal)"
              strokeOpacity={selected ? 1 : 0}
              strokeWidth="2.5"
              {...(interactive && onSelectArea
                ? {
                    role: "button",
                    tabIndex: 0,
                    "aria-pressed": selected,
                    "aria-label": `${a.label} (${a.count})`,
                    className: "cursor-pointer outline-none focus-visible:[stroke-opacity:1]",
                    onClick: () => onSelectArea(selected ? null : a.area.id),
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectArea(selected ? null : a.area.id);
                      }
                    },
                  }
                : { "aria-hidden": true })}
            />
            <text x={x} y={labelY} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)" aria-hidden="true">
              {a.label}
            </text>
          </g>
        );
      })}

      {cases.map((c) => {
        const center = (c.approximateArea.areaId && centerById.get(c.approximateArea.areaId)) || UNASSIGNED_POSITION;
        const [x, y] = toSvg(markerPosition(c.id, center), SIZE);
        const color = markerColorForCase(c, theme);
        const selected = selectedCaseId === c.id;
        const dimmed = selectedAreaId !== null && c.approximateArea.areaId !== selectedAreaId;
        const s = selected ? 1.4 : 1;
        const interactiveProps =
          interactive && onSelectCase
            ? {
                role: "button",
                tabIndex: 0,
                "aria-label": caseLabel(c),
                "aria-pressed": selected,
                className: "cursor-pointer outline-none [&:focus-visible>.cg-focus]:opacity-100",
                onClick: () => onSelectCase(c),
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectCase(c);
                  }
                },
              }
            : { "aria-hidden": true };
        return (
          <g key={c.id} transform={`translate(${x} ${y}) scale(${s})`} opacity={dimmed ? 0.35 : 1} {...interactiveProps}>
            <circle className="cg-focus" r="11" fill="none" stroke="var(--ink)" strokeWidth="2" opacity={selected ? 1 : 0} />
            {c.type === "proposal" ? (
              <path d="M0 -8 L7 0 L0 8 L-7 0 Z" fill={color} stroke="var(--cream)" strokeWidth="1.5" />
            ) : (
              <circle r="6.5" fill={color} stroke="var(--cream)" strokeWidth="1.5" />
            )}
          </g>
        );
      })}
    </svg>
  );
}
