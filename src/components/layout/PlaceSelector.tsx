"use client";

import { useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";
import { usePlaces } from "@/lib/places/context";
import { BUILT_IN_PLACES, MAX_PLACE_NAME_LENGTH, addPlace } from "@/lib/places/places";

const ADD = "__add__";

/**
 * The top-bar place picker. Configured CommonGround communities switch the whole app (the real
 * CommunityProvider). "Panama City" and any visitor-added places are listed too, but they have
 * nothing set up behind them, so choosing one shows an honest "not set up yet" state.
 */
export function PlaceSelector({ compact = false }: { compact?: boolean }) {
  const { community, communities, setCommunityId } = useCommunity();
  const { language } = useLanguage();
  const { activePlace, setActivePlace, savedPlaces, savePlaces } = usePlaces();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const t = FIELD.place;

  // Once a moderator sets up a real community with the same name, the placeholder entry for
  // that place disappears — the real community replaces it.
  const communityNames = new Set(communities.map((c) => normalizeName(c.displayName)));
  const builtInPlaces = BUILT_IN_PLACES.filter((p) => ![p.es, p.en, p.pt, p.fr, p.zh, p.hi, p.it].some((n) => communityNames.has(normalizeName(n))));
  const visibleSavedPlaces = savedPlaces.filter((p) => !communityNames.has(normalizeName(p)));

  const value =
    activePlace.kind === "community"
      ? `c:${community.id}`
      : BUILT_IN_PLACES.some((p) => p.en === activePlace.name.en)
        ? `b:${BUILT_IN_PLACES.find((p) => p.en === activePlace.name.en)!.key}`
        : `u:${activePlace.name.en}`;

  function onChange(next: string) {
    if (next === ADD) {
      setName("");
      setError(null);
      dialogRef.current?.showModal();
      return;
    }
    const [kind, id] = [next.slice(0, 1), next.slice(2)];
    if (kind === "c") {
      setCommunityId(id);
      setActivePlace({ kind: "community" });
    } else if (kind === "b") {
      const place = BUILT_IN_PLACES.find((p) => p.key === id);
      if (place) setActivePlace({ kind: "unconfigured", name: { es: place.es, en: place.en, pt: place.pt, fr: place.fr, zh: place.zh, hi: place.hi, it: place.it } });
    } else {
      setActivePlace({ kind: "unconfigured", name: { es: id, en: id, pt: id, fr: id, zh: id, hi: id, it: id } });
    }
  }

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const existing = [
      ...communities.map((c) => c.displayName),
      ...BUILT_IN_PLACES.flatMap((p) => [p.es, p.en, p.pt, p.fr, p.zh, p.hi, p.it]),
    ];
    const result = addPlace(savedPlaces, name, existing);
    if (!result.ok) {
      setError(t.errors[result.reason][language]);
      return;
    }
    savePlaces(result.places);
    setActivePlace({ kind: "unconfigured", name: { es: result.name, en: result.name, pt: result.name, fr: result.name, zh: result.name, hi: result.name, it: result.name } });
    dialogRef.current?.close();
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
          onChange={(e) => onChange(e.target.value)}
          className={`w-full min-w-0 appearance-none truncate rounded-full border border-line bg-transparent py-2 pl-3.5 pr-8 text-[0.8rem] font-extrabold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
            compact ? "max-w-[9.5rem]" : "max-w-[13rem]"
          }`}
        >
          <optgroup label={t.communitiesGroup[language]}>
            {communities.map((c) => (
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
              <option key={p} value={`u:${p}`}>
                {p}
              </option>
            ))}
          </optgroup>
          <option value={ADD}>{t.add[language]}</option>
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/70" />
      </span>

      <dialog
        ref={dialogRef}
        aria-labelledby="place-dialog-title"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current.close();
        }}
        className="m-auto w-[min(92vw,500px)] rounded-[30px] bg-surface p-[clamp(25px,4vw,42px)] text-ink shadow-[0_24px_90px_#142c2555] backdrop:bg-[#122c2380] backdrop:backdrop-blur-sm"
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
          <label htmlFor="place-name" className="text-[0.83rem] font-extrabold">
            {t.nameLabel[language]}
          </label>
          <input
            id="place-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={MAX_PLACE_NAME_LENGTH}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "place-error" : undefined}
            className="mt-2 w-full rounded-[13px] border border-line bg-paper px-3.5 py-3 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
          />
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
