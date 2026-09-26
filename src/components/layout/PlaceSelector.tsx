"use client";

import { useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";
import { usePlaces } from "@/lib/places/context";
import { BUILT_IN_PLACES, addPlace, formatPlaceLabel, type SavedPlace } from "@/lib/places/places";
import { startCommunityForPlaceAction } from "@/lib/store/actions";
import { EMPTY_PLACE_FIELDS, PlacePicker, type PlaceFields } from "@/components/places/PlacePicker";

const ADD = "__add__";

/**
 * The top-bar place picker. Configured CommonGround communities switch the whole app (the real
 * CommunityProvider). Places — "Panama City" and any the visitor adds by country / region / city /
 * neighborhood — open that place's community, starting a clearly-marked starter community if
 * none exists yet. Older name-only places (no parts) still show the "not set up yet" state.
 */
export function PlaceSelector({ compact = false }: { compact?: boolean }) {
  const { community, communities, setCommunityId, selectCommunity } = useCommunity();
  const { language } = useLanguage();
  const { activePlace, setActivePlace, savedPlaces, savePlaces } = usePlaces();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [fields, setFields] = useState<PlaceFields>(EMPTY_PLACE_FIELDS);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  // The place finder (and its map) only mounts while the dialog is open, so no map or tiles load
  // on ordinary page views.
  const [dialogOpen, setDialogOpen] = useState(false);
  const t = FIELD.place;

  // Starter communities are reached through their place, not listed for everyone: the shared
  // list only shows communities a moderator set up or reviewed.
  const listedCommunities = communities.filter((c) => c.status !== "starter");
  // Once a moderator sets up a real community with the same name, the placeholder entry for
  // that place disappears — the real community replaces it.
  const communityNames = new Set(listedCommunities.map((c) => normalizeName(c.displayName)));
  const builtInPlaces = BUILT_IN_PLACES.filter((p) => ![p.es, p.en, p.pt, p.fr, p.zh, p.hi, p.it].some((n) => communityNames.has(normalizeName(n))));
  const visibleSavedPlaces = savedPlaces.filter((p) => !communityNames.has(normalizeName(p.label)));

  // Which menu entry represents the current state. A starter community is shown as its place.
  const starterLabel = activePlace.kind === "community" && community.status === "starter" ? normalizeName(community.displayName) : null;
  const starterBuiltIn = starterLabel ? builtInPlaces.find((p) => normalizeName(formatPlaceLabel(p.parts)) === starterLabel) : undefined;
  const starterSaved = starterLabel ? visibleSavedPlaces.find((p) => normalizeName(p.label) === starterLabel) : undefined;
  const value = starterBuiltIn
    ? `b:${starterBuiltIn.key}`
    : starterSaved
      ? `u:${starterSaved.label}`
      : activePlace.kind === "community"
        ? `c:${community.id}`
        : BUILT_IN_PLACES.some((p) => p.en === activePlace.name.en)
          ? `b:${BUILT_IN_PLACES.find((p) => p.en === activePlace.name.en)!.key}`
          : `u:${activePlace.name.en}`;
  const showActiveStarterOption = starterLabel !== null && !starterBuiltIn && !starterSaved;

  function onChange(next: string) {
    if (next === ADD) {
      setFields(EMPTY_PLACE_FIELDS);
      setError(null);
      setDialogOpen(true);
      dialogRef.current?.showModal();
      return;
    }
    const [kind, id] = [next.slice(0, 1), next.slice(2)];
    if (kind === "c") {
      setCommunityId(id);
      setActivePlace({ kind: "community" });
    } else if (kind === "b") {
      const place = BUILT_IN_PLACES.find((p) => p.key === id);
      if (place) openPlace({ label: place[language], parts: { ...place.parts } });
    } else {
      const saved = savedPlaces.find((p) => p.label === id);
      openPlace(saved ?? { label: id });
    }
  }

  function showUnconfigured(place: SavedPlace) {
    const n = place.label;
    setActivePlace({ kind: "unconfigured", name: { es: n, en: n, pt: n, fr: n, zh: n, hi: n, it: n }, parts: place.parts });
  }

  /** Opens the place's community (starting a starter one if needed); falls back to "not set up yet". */
  async function openPlace(place: SavedPlace) {
    if (!place.parts) {
      showUnconfigured(place);
      return;
    }
    setOpening(true);
    try {
      const result = await startCommunityForPlaceAction(place.parts);
      if (result.ok) {
        selectCommunity(result.community);
        setActivePlace({ kind: "community" });
      } else {
        showUnconfigured(place);
      }
    } catch {
      showUnconfigured(place);
    } finally {
      setOpening(false);
    }
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const builtInNames = BUILT_IN_PLACES.flatMap((p) => [p.es, p.en, p.pt, p.fr, p.zh, p.hi, p.it]);
    const result = addPlace(savedPlaces, fields, builtInNames);
    if (!result.ok) {
      // Adding a place that's already saved just opens it.
      if (result.reason === "duplicate") {
        const already = savedPlaces.find((p) => p.parts && normalizeName(p.label) === normalizeName(formatPlaceLabel({ ...fields })));
        if (already) {
          dialogRef.current?.close();
          await openPlace(already);
          return;
        }
      }
      setError(t.errors[result.reason][language]);
      return;
    }
    savePlaces(result.places);
    dialogRef.current?.close();
    await openPlace(result.place);
  }

  return (
    <>
      <label className="sr-only" htmlFor="place-selector">
        {t.selectLabel[language]}
      </label>
      <span className="relative inline-flex min-w-0">
        <select
          id="place-selector"
          value={value}
          disabled={opening}
          aria-busy={opening || undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full min-w-0 appearance-none truncate rounded-full border border-line bg-transparent py-2 pl-3.5 pr-8 text-[0.8rem] font-extrabold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
            compact ? "max-w-[9.5rem]" : "max-w-[13rem]"
          }`}
        >
          <optgroup label={t.communitiesGroup[language]}>
            {listedCommunities.map((c) => (
              <option key={c.id} value={`c:${c.id}`}>
                {c.displayName}
              </option>
            ))}
          </optgroup>
          <optgroup label={t.placesGroup[language]}>
            {builtInPlaces.map((p) => (
              <option key={p.key} value={`b:${p.key}`}>
                {p[language]}
              </option>
            ))}
            {visibleSavedPlaces.map((p) => (
              <option key={p.label} value={`u:${p.label}`}>
                {p.label}
              </option>
            ))}
            {showActiveStarterOption && <option value={`c:${community.id}`}>{community.displayName}</option>}
          </optgroup>
          <option value={ADD}>{t.add[language]}</option>
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/70" />
      </span>

      <dialog
        ref={dialogRef}
        aria-labelledby="place-dialog-title"
        onClose={() => setDialogOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current.close();
        }}
        className="m-auto max-h-[92vh] w-[min(94vw,640px)] overflow-y-auto rounded-[30px] bg-surface p-[clamp(25px,4vw,42px)] text-ink shadow-[0_24px_90px_#142c2555] backdrop:bg-[#122c2380] backdrop:backdrop-blur-sm"
      >
        <form onSubmit={onAdd} className="relative">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label={t.close[language]}
            className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-mint text-ink hover:bg-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
          <p className="cg-eyebrow">{t.dialogCaps[language]}</p>
          <h2 id="place-dialog-title" className="my-3.5 text-[3.1rem] tracking-[-0.055em]">
            {t.dialogTitle[language]}
          </h2>
          <p className="mb-6 text-slate">{t.dialogNote[language]}</p>
          {dialogOpen && (
            <PlacePicker
              value={fields}
              onChange={(next) => {
                setFields(next);
                setError(null);
              }}
              language={language}
            />
          )}
          {error && (
            <p id="place-error" role="alert" className="mt-2 text-sm font-semibold text-coral">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="mt-6 inline-flex items-center gap-3 rounded-full bg-lime px-6 py-4 text-[0.8rem] font-extrabold text-[#172b25] hover:bg-lime-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          >
            {t.submit[language]} <span aria-hidden="true">↗</span>
          </button>
          <p className="mt-4 text-[0.8rem] text-slate">{t.local[language]}</p>
        </form>
      </dialog>
    </>
  );
}

function normalizeName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
