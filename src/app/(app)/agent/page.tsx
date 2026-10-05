"use client";

import { Bot } from "lucide-react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";
import { usePlaces } from "@/lib/places/context";
import { UnconfiguredPlace } from "@/components/map/UnconfiguredPlace";
import { AgentPipeline } from "@/components/agent/AgentPipeline";
import { AgentActivity } from "@/components/agent/AgentActivity";

/**
 * "Agente IA": the other side of the resident view — what the AI agent did with reports in the
 * community picked in the selector, built only from public timeline entries.
 */
export default function AgentPage() {
  const { community } = useCommunity();
  const { language } = useLanguage();
  const { activePlace } = usePlaces();
  const t = FIELD.agent;

  return (
    <div>
      <header className="mb-8">
        <p className="cg-eyebrow">{t.caps[language]}</p>
        <h1 className="mt-4 flex items-center gap-4 text-[clamp(3.2rem,6.1vw,6.4rem)] leading-[0.95] tracking-[-0.06em] text-ink">
          <Bot aria-hidden="true" className="h-[0.8em] w-[0.8em] shrink-0 text-teal" strokeWidth={1.5} />
          {t.title[language]}
        </h1>
        <p className="mt-4 max-w-[720px] text-lg text-ink/85">{t.intro[language]}</p>
        <AgentPipeline language={language} />
      </header>

      {activePlace.kind === "unconfigured" ? (
        <UnconfiguredPlace />
      ) : (
        <AgentActivity key={community.id} communityId={community.id} communityName={community.displayName} language={language} />
      )}
    </div>
  );
}
