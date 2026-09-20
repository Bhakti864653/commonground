"use client";

import { useSyncExternalStore } from "react";

function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Assume motion is fine during SSR — the client corrects this immediately after hydration. */
function getReducedMotionServerSnapshot(): boolean {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

// WebGL support never changes after mount, so there's nothing to subscribe to.
function noSubscription() {
  return () => {};
}

function getWebGLSnapshot(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Assume supported during SSR — corrected immediately on the client if it isn't. */
function getWebGLServerSnapshot(): boolean {
  return true;
}

export function useWebGLSupport(): boolean {
  return useSyncExternalStore(noSubscription, getWebGLSnapshot, getWebGLServerSnapshot);
}
