"use client";

import { useSyncExternalStore } from "react";

/**
 * Which demo-guide step a moderator is on, remembered in this browser (localStorage, wrapped in
 * try/catch so a blocked storage just means "not remembered"). A per-viewer convenience only.
 */
export type GuideState = { active: boolean; step: number };

// v2: a guide left on by an earlier version stays closed until it's opened again.
const KEY = "cg-demo-guide-v2";
const OFF: GuideState = { active: false, step: 1 };
const listeners = new Set<() => void>();
let cache: GuideState | null = null;

function read(): GuideState {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (parsed && typeof parsed.active === "boolean" && Number.isInteger(parsed.step)) return { active: parsed.active, step: parsed.step };
  } catch {
    // Storage blocked or unreadable: start fresh.
  }
  return OFF;
}

function getSnapshot(): GuideState {
  cache ??= read();
  return cache;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * While the guide is on, a cookie tells the server to leave residents' reports out of the
 * moderator screens (demo-mode.ts), so a recording only ever shows example cases. It only hides
 * things from this browser's own view; it can never reveal anything.
 */
export const DEMO_GUIDE_COOKIE = "cg_demo_guide_v2";

function setGuideCookie(on: boolean): void {
  try {
    document.cookie = on ? `${DEMO_GUIDE_COOKIE}=1; path=/; max-age=86400; samesite=lax` : `${DEMO_GUIDE_COOKIE}=; path=/; max-age=0; samesite=lax`;
  } catch {
    // Cookies blocked: resident reports simply stay visible.
  }
}

export function setGuideState(next: GuideState): void {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Not remembered across reloads; the guide still works on this page.
  }
  setGuideCookie(next.active);
  listeners.forEach((l) => l());
}

export function useGuideState(): GuideState {
  return useSyncExternalStore(subscribe, getSnapshot, () => OFF);
}
