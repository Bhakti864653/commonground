"use client";

import { ChevronDown } from "lucide-react";
import { COMMUNITIES } from "@/data/communities";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";

/**
 * The "active community always visible" requirement (DESIGN_SYSTEM.md) is satisfied by
 * rendering this in both the desktop sidebar and the mobile top bar, not just once — see
 * AppShell.tsx.
 */
export function CommunitySelector({ compact = false }: { compact?: boolean }) {
  const { community, setCommunityId } = useCommunity();
  const { language } = useLanguage();
  const isFictional = community.status === "demo";

  return (
    <div className={compact ? "min-w-0" : ""}>
      <label className="sr-only" htmlFor="community-selector">
        {UI_STRINGS.communitySelector.label[language]}
      </label>
      <div className={`relative ${compact ? "inline-block w-full max-w-[13rem]" : ""}`}>
        <select
          id="community-selector"
          value={community.id}
          onChange={(e) => setCommunityId(e.target.value)}
          aria-label={UI_STRINGS.communitySelector.switchTo[language]}
          className={`w-full appearance-none rounded-full border border-ink/15 bg-surface py-1.5 pl-3 pr-8 text-sm font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
            compact ? "truncate" : ""
          }`}
        >
          {COMMUNITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate"
        />
      </div>
      {isFictional && (
        <p className="mt-1 text-xs font-medium text-coral">
          {UI_STRINGS.fictionalBadge[language]}
        </p>
      )}
    </div>
  );
}
