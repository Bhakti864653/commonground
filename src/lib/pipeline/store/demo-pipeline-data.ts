import type { LocalizedText } from "@/lib/i18n/languages";
import type { Priority } from "../types";

/**
 * Hand-written pipeline history for the eight demonstration cases, so the demo shows every stage
 * of the pipeline without waiting for real reports. Clearly marked as example data everywhere it
 * appears (source "example"). One list, three users: the in-memory store, db/seed.sql, and
 * migration 0007 (which adds it to databases seeded earlier) — all generated from here.
 *
 * Cases are found by their fixed demo description. Days are counted back from when the seed runs.
 * `{CASE}` and `{URL}` in messages become the case number and its public link.
 */
export type DemoPipelineSeed = {
  description: string;
  routing: {
    officeId: string;
    priority: Priority;
    priorityReason: string;
    reason: string;
    confidence: number;
    alternativeOfficeIds?: string[];
    needsModeratorDecision?: boolean;
    /** Descriptions of other demo cases this one may duplicate, with the similarity score. */
    duplicates?: Array<{ description: string; score: number }>;
    critiqueConcern?: string;
    createdDaysAgo: number;
    /** Absent: still waiting for a moderator. */
    approvedDaysAgo?: number;
  };
  referral?: {
    createdDaysAgo: number;
    /** Absent: still waiting for a moderator. Present: in the dry-run outbox since then. */
    approvedDaysAgo?: number;
  };
  followUp?: {
    createdDaysAgo: number;
    approvedDaysAgo?: number;
    daysWithoutProgress: number;
    escalateTo: Priority | null;
  };
};

export const DEMO_FOLLOW_UP_UPDATE: LocalizedText = {
  es: "Moderación de CommonGround revisó este caso: sigue abierto y se preparó un recordatorio para la oficina responsable. El envío está en pausa en esta demo.",
  en: "CommonGround's moderators checked on this case: it is still open, and a reminder for the responsible office was prepared. Sending is paused in this demo.",
  pt: "A moderação do CommonGround verificou este caso: ele continua aberto e foi preparado um lembrete para o órgão responsável. O envio está pausado nesta demo.",
  fr: "Les modérateurs de CommonGround ont vérifié ce dossier : il est toujours ouvert et un rappel a été préparé pour le service responsable. L’envoi est en pause dans cette démo.",
  zh: "CommonGround 版主检查了此案件：案件仍未解决，已为负责部门准备了提醒。本演示中发送功能已暂停。",
  hi: "CommonGround के मॉडरेटरों ने इस मामले की जाँच की: यह अभी भी खुला है, और ज़िम्मेदार दफ़्तर के लिए एक रिमाइंडर तैयार किया गया। इस डेमो में भेजना रुका हुआ है।",
  it: "I moderatori di CommonGround hanno controllato questo caso: è ancora aperto ed è stato preparato un promemoria per l’ufficio competente. L’invio è in pausa in questa demo.",
};

export function demoReferralMessage(officeNameEs: string, categoryEs: string, areaEs: string, summaryEs: string, daysOpen: number): string {
  return `Estimado equipo de ${officeNameEs}:

Les escribimos desde CommonGround, un proyecto comunitario independiente (demo estudiantil). Un residente reportó el caso {CASE} (${categoryEs}, ${areaEs}): ${summaryEs}

El caso lleva ${daysOpen} días abierto. ¿Podrían indicarnos si su oficina puede revisarlo o quién lo atiende?

Caso público: {URL}

Muchas gracias.
Equipo de moderación de CommonGround`;
}

export function demoReminderMessage(officeNameEs: string, days: number): string {
  return `Estimado equipo de ${officeNameEs}:

Les escribimos de nuevo sobre el caso {CASE}, que sigue abierto y sin novedades desde hace ${days} días. ¿Podrían indicarnos si ya fue revisado o quién lo atiende?

Caso público: {URL}

Muchas gracias.
Equipo de moderación de CommonGround`;
}

const POSTE_1 = "Hay un poste de luz dañado frente a la escuela primaria del centro, no enciende desde hace una semana.";
const POSTE_2 = "Hay un poste de luz dañado cerca de la escuela primaria del centro, no enciende desde hace varios días.";
const ALCANTARILLA = "La alcantarilla en la calle principal del área norte está bloqueada y el agua se acumula cada vez que llueve.";
const DRENAJE = "El drenaje de la avenida norte sigue tapado, se forma un charco grande después de cada lluvia.";
const INUNDACION = "Inundación recurrente en el área norte por el mismo drenaje bloqueado, ya pasó tres veces este mes.";
const BASURA = "Acumulación de basura sin recoger en el área sur desde hace dos semanas.";
const LUMINARIAS = "Propongo instalar más luminarias solares en el parque del área este.";
const BACHE = "Bache grande en la vía principal del área oeste, ya provocó un accidente menor.";

export const DEMO_PIPELINE_SEEDS: DemoPipelineSeed[] = [
  {
    // Referral in the outbox for 7 days: overdue (high = 4 days), so "Run follow-up now" flags it.
    description: POSTE_1,
    routing: {
      officeId: "lighting",
      priority: "high",
      priorityReason: "A dark streetlight in front of a school is a safety risk for children at night.",
      reason: "A broken streetlight belongs to street lighting, even though it was filed under roads.",
      confidence: 0.88,
      createdDaysAgo: 9,
      approvedDaysAgo: 8,
    },
    referral: { createdDaysAgo: 8, approvedDaysAgo: 7 },
  },
  {
    // Routing waiting for a moderator, with a likely duplicate to merge.
    description: POSTE_2,
    routing: {
      officeId: "lighting",
      priority: "high",
      priorityReason: "Same dark streetlight near the school as an earlier report.",
      reason: "A streetlight that doesn't turn on is a street-lighting problem.",
      confidence: 0.84,
      duplicates: [{ description: POSTE_1, score: 0.67 }],
      critiqueConcern: "This looks like the same streetlight as an earlier case — consider merging instead of routing it twice.",
      createdDaysAgo: 6,
    },
  },
  {
    // At the follow-up stage: a follow-up suggestion (with escalation) waits for a moderator.
    description: ALCANTARILLA,
    routing: {
      officeId: "drainage",
      priority: "high",
      priorityReason: "Water collects every time it rains on a main street — recurring and affecting many people.",
      reason: "A blocked storm drain is a drainage problem.",
      confidence: 0.92,
      createdDaysAgo: 14,
      approvedDaysAgo: 13,
    },
    referral: { createdDaysAgo: 13, approvedDaysAgo: 12 },
    followUp: { createdDaysAgo: 1, daysWithoutProgress: 11, escalateTo: "urgent" },
  },
  {
    // Routed; the drafted referral (already checked by the Critic) waits for a moderator.
    description: DRENAJE,
    routing: {
      officeId: "drainage",
      priority: "medium",
      priorityReason: "A recurring puddle after rain: a real problem, no sign of immediate danger.",
      reason: "A blocked drain on the avenue is a drainage problem.",
      confidence: 0.9,
      duplicates: [{ description: ALCANTARILLA, score: 0.31 }],
      createdDaysAgo: 8,
      approvedDaysAgo: 3,
    },
    referral: { createdDaysAgo: 3 },
  },
  {
    // Just submitted: routing waits for a moderator, linked to two earlier reports.
    description: INUNDACION,
    routing: {
      officeId: "drainage",
      priority: "high",
      priorityReason: "Recurring flooding, three times this month, from the same blocked drain.",
      reason: "Flooding caused by a blocked drain is a drainage problem.",
      confidence: 0.9,
      duplicates: [
        { description: ALCANTARILLA, score: 0.38 },
        { description: DRENAJE, score: 0.33 },
      ],
      createdDaysAgo: 2,
    },
  },
  {
    // Follow-up approved two days ago: its public status update is on the case page.
    description: BASURA,
    routing: {
      officeId: "sanitation",
      priority: "medium",
      priorityReason: "Garbage left for two weeks: a growing health nuisance, no immediate danger.",
      reason: "Uncollected garbage is a sanitation problem.",
      confidence: 0.95,
      createdDaysAgo: 11,
      approvedDaysAgo: 10,
    },
    referral: { createdDaysAgo: 10, approvedDaysAgo: 9 },
    followUp: { createdDaysAgo: 2, approvedDaysAgo: 2, daysWithoutProgress: 7, escalateTo: null },
  },
  {
    // Low confidence, two offices fit: the Routing Agent asks the moderator to decide.
    description: LUMINARIAS,
    routing: {
      officeId: "lighting",
      priority: "low",
      priorityReason: "A proposal for an improvement, not a current problem.",
      reason: "Solar lamps are street lighting, but they would go in a park.",
      confidence: 0.52,
      alternativeOfficeIds: ["parks"],
      needsModeratorDecision: true,
      critiqueConcern: "Two offices could reasonably handle this (lighting for the lamps, parks for the place). A moderator should choose.",
      createdDaysAgo: 4,
    },
  },
  {
    // Closed case that went through the whole pipeline.
    description: BACHE,
    routing: {
      officeId: "public-works",
      priority: "high",
      priorityReason: "The pothole already caused a minor accident on a main road.",
      reason: "A pothole on a main road is a public-works problem.",
      confidence: 0.94,
      createdDaysAgo: 25,
      approvedDaysAgo: 24,
    },
    referral: { createdDaysAgo: 24, approvedDaysAgo: 23 },
  },
];

/** The one-sentence Spanish summary each demo referral uses (the description itself, shortened). */
export function demoSummaryEs(description: string): string {
  return description.replace(/\.$/, "") + ".";
}

/** The audit actor for hand-written example steps. */
export const DEMO_ACTOR_SUFFIX = " (example data, written by hand for the demo)";

/** A seven-language text as a timeline entry's note fields (English note, Spanish noteEs, the rest). */
export function asTimelineNote(text: LocalizedText): { note: string; noteEs: string; notes: { pt: string; fr: string; zh: string; hi: string; it: string } } {
  return { note: text.en, noteEs: text.es, notes: { pt: text.pt, fr: text.fr, zh: text.zh, hi: text.hi, it: text.it } };
}
