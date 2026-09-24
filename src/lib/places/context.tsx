"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { PLACES_STORAGE_KEY, parseStoredPlaces } from "./places";

/** Either a configured community (see CommunityProvider) or a place with nothing set up yet. */
export type ActivePlace = { kind: "community" } | { kind: "unconfigured"; name: { es: string; en: string } };

type PlacesContextValue = {
  activePlace: ActivePlace;
  setActivePlace: (place: ActivePlace) => void;
  savedPlaces: string[];
  savePlaces: (places: string[]) => void;
};

const PlacesContext = createContext<PlacesContextValue | null>(null);
const CHANGE_EVENT = "commonground-places-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(PLACES_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

export function PlacesProvider({ children }: { children: ReactNode }) {
  const [activePlace, setActivePlace] = useState<ActivePlace>({ kind: "community" });
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const savedPlaces = useMemo(() => parseStoredPlaces(raw), [raw]);

  const savePlaces = useCallback((places: string[]) => {
    try {
      localStorage.setItem(PLACES_STORAGE_KEY, JSON.stringify(places));
    } catch {
      // Storage blocked (private window): the place still works for this page view.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo(
    () => ({ activePlace, setActivePlace, savedPlaces, savePlaces }),
    [activePlace, savedPlaces, savePlaces],
  );
  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>;
}

export function usePlaces(): PlacesContextValue {
  const ctx = useContext(PlacesContext);
  if (!ctx) throw new Error("usePlaces must be used within a PlacesProvider");
  return ctx;
}
