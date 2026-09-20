import type { Language } from "@/lib/i18n/dictionary";

/** "Paso 2 de 5" — visible step progress on every step, per CLAUDE.md's UI conventions. */
export function StepProgress({
  step,
  totalSteps,
  language,
}: {
  step: number;
  totalSteps: number;
  language: Language;
}) {
  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-slate">
        {language === "es"
          ? `Paso ${step} de ${totalSteps}`
          : `Step ${step} of ${totalSteps}`}
      </p>
      <div className="mt-2 flex gap-1.5" role="presentation">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-teal" : "bg-ink/10"}`}
          />
        ))}
      </div>
    </div>
  );
}
