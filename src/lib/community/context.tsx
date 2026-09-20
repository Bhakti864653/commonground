"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { COMMUNITIES, getCommunityById } from "@/data/communities";
import type { CommunityConfig } from "@/lib/schema/community";

const DEFAULT_COMMUNITY_ID = COMMUNITIES[0].id;

type CommunityContextValue = {
  community: CommunityConfig;
  setCommunityId: (id: string) => void;
};

const CommunityContext = createContext<CommunityContextValue | null>(null);

/**
 * In-memory only, matching this prototype phase's "local mock persistence" scope
 * (ARCHITECTURE.md) — the active community resets to the default on reload rather than
 * persisting, which also sidesteps this repo's strict no-setState-in-effect lint rule that a
 * localStorage-hydration approach would otherwise hit.
 */
export function CommunityProvider({ children }: { children: ReactNode }) {
  const [communityId, setCommunityId] = useState(DEFAULT_COMMUNITY_ID);

  const value = useMemo<CommunityContextValue>(
    () => ({
      community: getCommunityById(communityId) ?? COMMUNITIES[0],
      setCommunityId: (id: string) => {
        if (!getCommunityById(id)) return;
        setCommunityId(id);
      },
    }),
    [communityId],
  );

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity(): CommunityContextValue {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error("useCommunity must be used within a CommunityProvider");
  return ctx;
}
