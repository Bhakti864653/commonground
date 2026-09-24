import type { ReportStatus } from "@/lib/schema/report";

/** The admin tools are English-only today; Spanish is kept for a future bilingual admin. */
type AdminLanguage = "es" | "en";

/**
 * Rule-based templates, not an LLM call — a moderator's own note (if any) is appended
 * verbatim, never rewritten, since only a human should be putting specific claims into a
 * resident-visible status note (PRIVACY.md: never claim a case was forwarded/acted on unless a
 * moderator explicitly said so).
 */
const TEMPLATES: Record<ReportStatus, Record<AdminLanguage, string>> = {
  received: {
    es: "Tu envío fue recibido y está en la fila para revisión.",
    en: "Your submission was received and is in the queue for review.",
  },
  under_review: {
    es: "El equipo de moderación está revisando este caso.",
    en: "The moderation team is reviewing this case.",
  },
  in_discussion: {
    es: "Este caso está en discusión activa entre moderadores.",
    en: "This case is under active discussion among moderators.",
  },
  referred: {
    es: "Este caso fue derivado a la parte correspondiente para su seguimiento.",
    en: "This case was referred to the relevant party for follow-up.",
  },
  in_progress: {
    es: "Se está trabajando activamente en este caso.",
    en: "Work on this case is actively underway.",
  },
  updated: {
    es: "Hay una actualización nueva sobre este caso.",
    en: "There's a new update on this case.",
  },
  closed: {
    es: "Este caso ha sido cerrado.",
    en: "This case has been closed.",
  },
  not_verifiable: {
    es: "No fue posible verificar la información de este caso.",
    en: "It wasn't possible to verify this case's information.",
  },
};

export function draftStatusChangeExplanation(
  newStatus: ReportStatus,
  language: AdminLanguage,
  moderatorNote?: string,
): string {
  const base = TEMPLATES[newStatus][language];
  const trimmedNote = moderatorNote?.trim();
  return trimmedNote ? `${base} ${trimmedNote}` : base;
}
