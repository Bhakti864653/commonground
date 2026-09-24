import type { Language } from "@/lib/i18n/dictionary";

/** "Paso 2 de 5" plus the reference's segmented stepper — visible progress on every step. */
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
      <div className="flex gap-2" role="presentation">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-forest" : "bg-line"}`} />
        ))}
      </div>
      <p className="cg-eyebrow mt-6">
        {language === "es" ? `Paso ${step} de ${totalSteps}` : `Step ${step} of ${totalSteps}`}
      </p>
    </div>
  );
}
