"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { COMMUNITIES } from "@/data/communities";
import type { CommunityConfig } from "@/lib/schema/community";
import { listCommunitiesForResidents } from "@/lib/store/actions";

const DEFAULT_COMMUNITY_ID = COMMUNITIES[0].id;

type CommunityContextValue = {
  community: CommunityConfig;
  /** Built-in communities plus any a moderator has set up (loaded from the server). */
  communities: CommunityConfig[];
  setCommunityId: (id: string) => void;
  refreshCommunities: () => Promise<void>;
};

const CommunityContext = createContext<CommunityContextValue | null>(null);

/**
 * The active community is in-memory only (it resets to the default on reload), matching this
 * prototype's "local mock persistence" scope (ARCHITECTURE.md). The list starts as the
 * built-in communities (so server and first client render agree) and is then refreshed from
 * the server to include any a moderator created.
 */
export function CommunityProvider({ children }: { children: ReactNode }) {
  const [communityId, setCommunityIdState] = useState(DEFAULT_COMMUNITY_ID);
  const [communities, setCommunities] = useState<CommunityConfig[]>(COMMUNITIES);

  const refreshCommunities = useCallback(async () => {
    try {
      const list = await listCommunitiesForResidents();
      if (list.length > 0) setCommunities(list);
    } catch {
      // Keep the built-in list if the server can't be reached.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listCommunitiesForResidents()
      .then((list) => {
        if (!cancelled && list.length > 0) setCommunities(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<CommunityContextValue>(() => {
    const find = (id: string) => communities.find((c) => c.id === id);
    return {
      community: find(communityId) ?? communities[0],
      communities,
      setCommunityId: (id: string) => {
        if (!find(id)) return;
        setCommunityIdState(id);
      },
      refreshCommunities,
    };
  }, [communityId, communities, refreshCommunities]);

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity(): CommunityContextValue {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error("useCommunity must be used within a CommunityProvider");
  return ctx;
}
