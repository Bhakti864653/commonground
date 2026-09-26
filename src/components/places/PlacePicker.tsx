"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import type { Language } from "@/lib/i18n/languages";
import { INFO } from "@/lib/i18n/community-info";
import { MAX_PLACE_PART_LENGTH } from "@/lib/places/places";
import { placeAtPointAction, searchPlacesAction } from "@/lib/store/actions";
import type { PlaceSuggestion } from "@/lib/places/geocode";
import { PlaceLocatorMap, type BBox } from "./PlaceLocatorMap";

export type PlaceFields = { country: string; region: string; city: string; neighborhood: string };
export const EMPTY_PLACE_FIELDS: PlaceFields = { country: "", region: "", city: "", neighborhood: "" };

const field =
  "mt-1 w-full rounded-[11px] border border-line bg-paper px-3 py-2.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal";

function toFields(s: PlaceSuggestion): PlaceFields {
  return {
    country: s.parts.country,
    region: s.parts.region ?? "",
    city: s.parts.city ?? "",
    neighborhood: s.parts.neighborhood ?? "",
  };
}

/**
 * Find a place precisely: search (only on an explicit click — OpenStreetMap's search forbids
 * search-as-you-type), pick a result, or tap the map; each fills country / region / city /
 * neighborhood, and every field stays editable. Only the names leave this component.
 */
export function PlacePicker({
  value,
  onChange,
  language,
}: {
  value: PlaceFields;
  onChange: (next: PlaceFields) => void;
  language: Language;
}) {
  const t = INFO.picker;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSuggestion[] | null>(null);
  const [status, setStatus] = useState<"idle" | "searching" | "locating" | "unavailable">("idle");
  const [bbox, setBbox] = useState<BBox | null>(null);
  const [mapAvailable, setMapAvailable] = useState(true);

  function choose(s: PlaceSuggestion) {
    onChange(toFields(s));
    setBbox(s.bbox);
  }

  async function runSearch() {
    if (query.trim().length < 2 || status === "searching") return;
    setStatus("searching");
    try {
      const res = await searchPlacesAction(query, language);
      if (!res.ok) {
        setStatus("unavailable");
        setResults(null);
        return;
      }
      setResults(res.results);
      setStatus("idle");
      if (res.results.length === 1) choose(res.results[0]);
    } catch {
      setStatus("unavailable");
    }
  }

  async function pickPoint(lat: number, lng: number) {
    if (status === "locating") return;
    setStatus("locating");
    try {
      const res = await placeAtPointAction(lat, lng, language);
      if (res.ok && res.results[0]) {
        onChange(toFields(res.results[0]));
        setStatus("idle");
      } else {
        setStatus(res.ok ? "idle" : "unavailable");
      }
    } catch {
      setStatus("unavailable");
    }
  }

  const set = (key: keyof PlaceFields) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [key]: e.target.value });

  return (
    <div className="flex flex-col gap-4">
      {/* Search. Not a nested <form> (the dialog already is one): Enter runs the search instead of submitting. */}
      <div>
        <label htmlFor="place-search" className="text-[0.83rem] font-extrabold">
          {t.searchLabel[language]}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="place-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
            maxLength={120}
            placeholder={t.searchHint[language]}
            className={`${field} mt-0 min-w-0 flex-1`}
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={status === "searching" || query.trim().length < 2}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-[0.8rem] font-extrabold text-paper hover:bg-ink/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-50"
          >
            <Search aria-hidden="true" className="h-4 w-4" />
            {status === "searching" ? t.searching[language] : t.search[language]}
          </button>
        </div>
      </div>

      <div aria-live="polite">
        {status === "unavailable" && <p className="text-sm font-semibold text-coral">{t.unavailable[language]}</p>}
        {results && results.length === 0 && status !== "unavailable" && <p className="text-sm text-slate">{t.noResults[language]}</p>}
        {results && results.length > 1 && (
          <fieldset>
            <legend className="text-[0.83rem] font-extrabold">{t.results[language]}</legend>
            <ul className="mt-2 flex flex-col gap-1.5">
              {results.map((r, i) => (
                <li key={`${i}-${r.label}`}>
                  <button
                    type="button"
                    onClick={() => choose(r)}
                    className="flex w-full items-start gap-2 rounded-[11px] border border-line px-3 py-2 text-left text-sm text-ink hover:bg-mint focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
                  >
                    <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
      </div>

      {mapAvailable && (
        <div className="flex flex-col gap-1.5">
          <PlaceLocatorMap bbox={bbox} onPick={pickPoint} label={t.mapLabel[language]} onUnavailable={() => setMapAvailable(false)} />
          <p className="text-xs text-slate">
            {status === "locating" ? t.locating[language] : t.mapHint[language]}
          </p>
          <p className="text-[0.7rem] text-slate">{t.attribution[language]}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[0.83rem] font-extrabold">
          {t.country[language]}
          <input value={value.country} onChange={set("country")} maxLength={MAX_PLACE_PART_LENGTH} required autoComplete="off" className={field} />
        </label>
        <label className="text-[0.83rem] font-extrabold">
          {t.region[language]}
          <input value={value.region} onChange={set("region")} maxLength={MAX_PLACE_PART_LENGTH} autoComplete="off" className={field} />
        </label>
        <label className="text-[0.83rem] font-extrabold">
          {t.city[language]}
          <input value={value.city} onChange={set("city")} maxLength={MAX_PLACE_PART_LENGTH} required autoComplete="off" className={field} />
        </label>
        <label className="text-[0.83rem] font-extrabold">
          {t.neighborhood[language]}
          <input value={value.neighborhood} onChange={set("neighborhood")} maxLength={MAX_PLACE_PART_LENGTH} autoComplete="off" className={field} />
        </label>
      </div>
    </div>
  );
}
