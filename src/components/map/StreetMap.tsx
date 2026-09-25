"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import type { Language } from "@/lib/i18n/dictionary";
import { FIELD } from "@/lib/i18n/field-notes";
import { labelOf } from "@/lib/i18n/labels";
import type { CommunityConfig, MapDirection, MapSettings } from "@/lib/schema/community";
import type { PublicCase } from "@/lib/schema/report";
import { circleRing, communityBounds, zoneCenter, zoneRadiusKm } from "@/lib/map/geo";
import { useTheme } from "@/lib/theme/use-theme";
import { CasePin } from "./CasePin";

/**
 * OpenFreeMap's keyless OpenStreetMap tiles. The visitor's browser fetches them directly, so
 * that service sees the visitor's IP address (documented in docs/PRIVACY.md); nothing about
 * cases or residents is ever sent to it.
 */
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

/**
 * A real street map of the community. Each configured compass area is a soft zone, and cases
 * sit inside their zone's label as numbered markers — never at a point on a street, because
 * no case has one. If the map can't start (no WebGL), `onUnavailable` hands back to the
 * illustrative map.
 */
export function StreetMap({
  community,
  settings,
  cases,
  selectedId,
  onSelect,
  onUnavailable,
  language,
}: {
  community: CommunityConfig;
  settings: MapSettings;
  cases: PublicCase[];
  selectedId: string | null;
  onSelect: (c: PublicCase) => void;
  onUnavailable: () => void;
  language: Language;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [zoneElements, setZoneElements] = useState<Record<string, HTMLElement>>({});
  const { theme } = useTheme();
  const t = FIELD.home;

  const placedAreas = community.areas.filter((a) => a.mapDirection);

  // One map per community. The UI strings are fixed at creation; a language change rebuilds it.
  const areaKey = placedAreas.map((a) => `${a.id}:${a.mapDirection}`).join(",");
  const settingsKey = `${settings.center.lat},${settings.center.lng},${settings.radiusKm}`;
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    const markers: { remove: () => void }[] = [];

    import("maplibre-gl").then(({ default: maplibre }) => {
      if (cancelled || !container.current) return;
      try {
        map = new maplibre.Map({
          container: container.current,
          style: STYLE_URL,
          bounds: communityBounds(settings),
          fitBoundsOptions: { padding: { top: 110, bottom: 60, left: 20, right: 20 } },
          // Credited in the map's heading instead (MapCredit), where it never covers markers.
          attributionControl: false,
          cooperativeGestures: true,
          dragRotate: false,
          touchPitch: false,
          pitchWithRotate: false,
          maxZoom: 17,
          minZoom: 10,
          locale: {
            "Map.Title": t.mapTitle[language],
            "NavigationControl.ZoomIn": t.mapZoomIn[language],
            "NavigationControl.ZoomOut": t.mapZoomOut[language],
            "CooperativeGesturesHandler.WindowsHelpText": t.mapScrollHelp[language],
            "CooperativeGesturesHandler.MacHelpText": t.mapScrollHelpMac[language],
            "CooperativeGesturesHandler.MobileHelpText": t.mapTouchHelp[language],
          },
        });
      } catch {
        onUnavailable();
        return;
      }
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");

      map.on("style.load", () => {
        if (!map) return;
        addZones(map, settings, placedAreas.map((a) => a.mapDirection!));
        applyPalette(map);
      });

      const elements: Record<string, HTMLElement> = {};
      for (const area of placedAreas) {
        const el = document.createElement("div");
        el.setAttribute("role", "group");
        el.setAttribute("aria-label", labelOf(area, language));
        elements[area.id] = el;
        markers.push(new maplibre.Marker({ element: el, anchor: "center" }).setLngLat(zoneCenter(area.mapDirection, settings)!).addTo(map));
      }
      setZoneElements(elements);
    });

    return () => {
      cancelled = true;
      markers.forEach((m) => m.remove());
      map?.remove();
      mapRef.current = null;
    };
    // Keyed on values, not object identity: the community list is refetched from the server,
    // and a new-but-equal config must not rebuild the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.id, areaKey, settingsKey, language]);

  // Theme changes recolor the existing map instead of rebuilding it.
  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) applyPalette(map);
  }, [theme]);

  return (
    <>
      {/* maplibre's unlayered CSS forces its container to position: relative, which beats
          Tailwind's layered utilities, so the positioning lives on a wrapper. */}
      <div className="cg-streetmap absolute inset-0">
        <div ref={container} className="h-full w-full" />
      </div>
      {placedAreas.map((area) => {
        const el = zoneElements[area.id];
        if (!el) return null;
        const inZone = cases.map((c, i) => ({ c, i })).filter(({ c }) => c.approximateArea.areaId === area.id);
        return createPortal(
          <div className="flex max-w-[128px] flex-col items-center gap-1.5">
            {/* Wraps on narrow maps, where neighboring zone labels would otherwise collide. */}
            <span className="max-w-[84px] rounded-[10px] bg-surface/90 px-2 py-1 text-center text-[0.6rem] font-extrabold uppercase leading-tight tracking-[0.1em] text-map-text shadow-[0_3px_10px_#12352620] md:max-w-none md:whitespace-nowrap">
              {labelOf(area, language)}
            </span>
            {inZone.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1">
                {inZone.map(({ c, i }) => (
                  <CasePin key={c.id} c={c} index={i} selected={c.id === selectedId} onSelect={onSelect} language={language} size="sm" />
                ))}
              </div>
            )}
          </div>,
          el,
          area.id,
        );
      })}
    </>
  );
}

/** Cases the street map can't place: no area given, or an area without a map direction. */
export function casesOffStreetMap(cases: PublicCase[], community: CommunityConfig) {
  const placed = new Set(community.areas.filter((a) => a.mapDirection).map((a) => a.id));
  return cases.map((c, i) => ({ c, i })).filter(({ c }) => !c.approximateArea.areaId || !placed.has(c.approximateArea.areaId));
}

function addZones(map: MapLibreMap, settings: MapSettings, directions: MapDirection[]) {
  const radius = zoneRadiusKm(settings);
  map.addSource("cg-zones", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: directions.map((direction) => ({
        type: "Feature",
        properties: { direction },
        geometry: { type: "Polygon", coordinates: [circleRing(zoneCenter(direction, settings)!, radius)] },
      })),
    },
  });
  // Every zone gets the same color: more cases never makes an area look worse.
  map.addLayer({ id: "cg-zones-fill", type: "fill", source: "cg-zones", paint: { "fill-color": "#35584a", "fill-opacity": 0.12 } });
  map.addLayer({
    id: "cg-zones-line",
    type: "line",
    source: "cg-zones",
    paint: { "line-color": "#35584a", "line-width": 1.5, "line-dasharray": [2, 2], "line-opacity": 0.7 },
  });
}

/** Repaint the base map in the app's own map colors (they differ in light and dark themes). */
function applyPalette(map: MapLibreMap) {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  const land = token("--map");
  const road = token("--map-road");
  const water = token("--map-water");
  const park = token("--map-park");
  const text = token("--map-text");
  const zone = token("--forest");

  const layers = (map.getStyle() as StyleSpecification).layers;
  for (const layer of layers) {
    const { id, type } = layer;
    if (type === "background") map.setPaintProperty(id, "background-color", land);
    else if (type === "fill" && id === "water") map.setPaintProperty(id, "fill-color", water);
    else if (type === "fill" && /park|wood/.test(id)) map.setPaintProperty(id, "fill-color", park);
    else if (type === "fill" && id === "landuse_residential") map.setPaintProperty(id, "fill-opacity", 0);
    else if (type === "fill" && id === "building") {
      map.setPaintProperty(id, "fill-color", park);
      map.setPaintProperty(id, "fill-opacity", 0.55);
    } else if (type === "line" && id === "waterway") map.setPaintProperty(id, "line-color", water);
    else if (type === "line" && /^highway_/.test(id)) map.setPaintProperty(id, "line-color", /casing|subtle/.test(id) ? park : road);
    else if (type === "symbol" && /shield/.test(id)) map.setLayoutProperty(id, "visibility", "none");
    else if (type === "symbol") {
      map.setPaintProperty(id, "text-color", text);
      map.setPaintProperty(id, "text-halo-color", land);
    } else if (id === "cg-zones-fill") map.setPaintProperty(id, "fill-color", zone);
    else if (id === "cg-zones-line") map.setPaintProperty(id, "line-color", zone);
  }
}

/** The OpenStreetMap / OpenFreeMap credit the tiles' license requires, always visible. */
export function MapCredit({ language }: { language: Language }) {
  const link = "pointer-events-auto underline decoration-map-text/40 underline-offset-2 hover:decoration-map-text";
  return (
    <p className="mt-1 text-[0.68rem] font-semibold text-map-text/90">
      {FIELD.home.mapCredit[language]}{" "}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className={link}>
        © OpenStreetMap
      </a>{" "}
      ·{" "}
      <a href="https://openfreemap.org" target="_blank" rel="noreferrer" className={link}>
        OpenFreeMap
      </a>
    </p>
  );
}
