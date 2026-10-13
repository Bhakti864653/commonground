"use client";

import { useSyncExternalStore } from "react";

/**
 * Which demo-guide step a moderator is on, remembered in this browser (localStorage, wrapped in
 * try/catch so a blocked storage just means "not remembered"). A per-viewer convenience only.
 */
export type GuideState = { active: boolean; step: number };

const KEY = "cg-demo-guide";
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

export function setGuideState(next: GuideState): void {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Not remembered across reloads; the guide still works on this page.
  }
  listeners.forEach((l) => l());
}

export function useGuideState(): GuideState {
  return useSyncExternalStore(subscribe, getSnapshot, () => OFF);
}
