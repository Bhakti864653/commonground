"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

/** Same keyless OpenStreetMap tiles as the community street map (see docs/PRIVACY.md). */
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

/** [south, north, west, east], Nominatim's bounding-box order. */
export type BBox = [number, number, number, number];

/**
 * A small map for confirming a place. It frames the chosen area, and a tap reports the point to
 * `onPick` so the caller can look up the named area there — the point itself is never kept.
 * Camera moves are instant (no fly animation), which also suits prefers-reduced-motion.
 */
export function PlaceLocatorMap({
  bbox,
  onPick,
  label,
  onUnavailable,
}: {
  bbox: BBox | null;
  onPick: (lat: number, lng: number) => void;
  label: string;
  onUnavailable: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onPickRef = useRef(onPick);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let cancelled = false;
    import("maplibre-gl").then(({ default: maplibre }) => {
      if (cancelled || !container.current) return;
      try {
        const map = new maplibre.Map({
          container: container.current,
          style: STYLE_URL,
          center: [0, 20],
          zoom: 0.6,
          attributionControl: false,
          cooperativeGestures: true,
        });
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        map.on("click", (e) => onPickRef.current(e.lngLat.lat, e.lngLat.lng));
        map.on("load", () => {
          if (!cancelled) setReady(true);
        });
        mapRef.current = map;
      } catch {
        onUnavailable();
      }
    });
    return () => {
      cancelled = true;
      // Documented teardown: releases the WebGL context and all handlers.
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is created once; bbox changes are applied by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !bbox) return;
    const [south, north, west, east] = bbox;
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 24, maxZoom: 15, animate: false },
    );
  }, [bbox, ready]);

  return (
    <div
      ref={container}
      role="region"
      aria-label={label}
      className="h-[220px] w-full overflow-hidden rounded-[16px] border border-line bg-map"
    />
  );
}
