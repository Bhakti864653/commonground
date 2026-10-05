import { ArrowRight, Bot, FileText, Send, ShieldCheck, Sparkles } from "lucide-react";
import type { Language } from "@/lib/i18n/dictionary";
import { FIELD } from "@/lib/i18n/field-notes";

const STEPS = [
  { key: "report", icon: FileText, byAgent: false },
  { key: "reviews", icon: Sparkles, byAgent: true },
  { key: "prepares", icon: Bot, byAgent: true },
  { key: "approves", icon: ShieldCheck, byAgent: false },
  { key: "referred", icon: Send, byAgent: false },
] as const;

/** Report → AI reviews → AI prepares referral → Moderator approves → Referred, as a numbered list. */
export function AgentPipeline({ language }: { language: Language }) {
  const t = FIELD.agent;
  return (
    <section aria-labelledby="agent-steps" className="mt-8">
      <h2 id="agent-steps" className="sr-only">
        {t.stepsLabel[language]}
      </h2>
      <ol className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={step.key} className="flex items-center gap-2 md:flex-1">
              <span
                className={`flex w-full items-center gap-2.5 rounded-[17px] px-3.5 py-3 text-[0.9rem] font-bold text-ink md:h-full md:flex-col md:items-start md:gap-2 ${
                  step.byAgent ? "bg-mint" : "border border-line bg-surface"
                }`}
              >
                <span className="flex items-center gap-2 text-[0.72rem] font-extrabold text-slate">
                  <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <Icon aria-hidden="true" className={`h-4 w-4 ${step.byAgent ? "text-teal" : "text-ink"}`} />
                </span>
                {t.steps[step.key][language]}
              </span>
              {i < STEPS.length - 1 && (
                <ArrowRight aria-hidden="true" className="hidden h-4 w-4 shrink-0 text-slate md:mx-1.5 md:block" />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
