import type { ReferralUrgency, ReportStatus, TimelineEventKind } from "@/lib/schema/report";

/**
 * The fixed demonstration cases for the Santiago de Veraguas pilot — clearly labeled
 * (`sourceType: "demonstration"`, `verificationState: "demonstration_data"`), never presented
 * as real resident submissions. One list, two users: the in-memory store seeds these whenever
 * it starts empty, and db/seed.sql (generated from this list by demo-seed-sql.ts) inserts
 * them once into the database.
 */
export type DemoCaseSeed = {
  type: "report" | "proposal";
  categoryId: string;
  description: string;
  areaId: string;
  areaLabel: string;
  areaLabelEs: string;
  daysAgo: number;
  status: ReportStatus;
  secondStatus?: ReportStatus;
  /** What the AI agent did with this case (see demoAgentSteps). None: from before the agent existed. */
  agent?: DemoAgentSeed;
};

/**
 * The AI reviewed the case a few minutes after it arrived and, with `referral`, prepared a
 * referral to the Alcaldía that is either still waiting for a moderator or was approved.
 */
export type DemoAgentSeed = {
  referral?: {
    urgency: ReferralUrgency;
    /** The drafted message moderators see on /admin — never public. */
    message: string;
    /** Days after the report that a moderator approved it; absent means still waiting. */
    approvedAfterDays?: number;
  };
};

export const DEMO_COMMUNITY_ID = "santiago-veraguas";
export const DEMO_CONSENT_VERSION = "2026-09-19.v1";

/** The note on a seeded moderator status change — only what CommonGround itself recorded. */
export const DEMO_STATUS_CHANGE_NOTE = {
  note: "A community moderator updated this case's status.",
  noteEs: "Un moderador de la comunidad actualizó el estado de este caso.",
  notes: {
    pt: "Um moderador da comunidade atualizou o status deste caso.",
    fr: "Un modérateur de la communauté a mis à jour l’état de ce dossier.",
    zh: "一位社区版主更新了此案件的状态。",
    hi: "एक सामुदायिक मॉडरेटर ने इस मामले की स्थिति अपडेट की।",
    it: "Un moderatore della comunità ha aggiornato lo stato di questo caso.",
  },
};

/** The office every demonstration referral goes to (Santiago's routing sends these categories there). */
export const DEMO_REFERRAL_OFFICE = "alcaldia-santiago-oficina";

/** The reasoning stored with a demonstration referral, so moderators can tell it wasn't a real AI run. */
export const DEMO_REFERRAL_REASONING = "Demonstration data: written by hand for the demo, not produced by the AI.";

const DEMO_MESSAGE = (problem: string) =>
  `[Datos de demostración] Estimada Alcaldía de Santiago: vecinos reportaron en CommonGround ${problem}. ` +
  "Les compartimos el reporte para su conocimiento. Gracias por su atención.";

export const DEMO_CASE_SEEDS: DemoCaseSeed[] = [
  // Near-duplicate pair (road-infrastructure/centro) — exercises duplicate cluster detection.
  {
    type: "report",
    categoryId: "road-infrastructure",
    areaId: "centro",
    areaLabel: "Central area",
    areaLabelEs: "Área central",
    description:
      "Hay un poste de luz dañado frente a la escuela primaria del centro, no enciende desde hace una semana.",
    daysAgo: 9,
    status: "received",
    agent: { referral: { urgency: "medium", approvedAfterDays: 1, message: DEMO_MESSAGE("un poste de luz dañado frente a la escuela primaria del área central, que no enciende desde hace una semana") } },
  },
  {
    type: "report",
    categoryId: "road-infrastructure",
    areaId: "centro",
    areaLabel: "Central area",
    areaLabelEs: "Área central",
    description:
      "Hay un poste de luz dañado cerca de la escuela primaria del centro, no enciende desde hace varios días.",
    daysAgo: 6,
    status: "received",
    agent: {},
  },
  // Three reports in the same category+area within 30 days — exercises trend detection.
  {
    type: "report",
    categoryId: "flooding-drainage",
    areaId: "norte",
    areaLabel: "Northern area",
    areaLabelEs: "Área norte",
    description:
      "La alcantarilla en la calle principal del área norte está bloqueada y el agua se acumula cada vez que llueve.",
    daysAgo: 14,
    status: "under_review",
    agent: { referral: { urgency: "medium", approvedAfterDays: 3, message: DEMO_MESSAGE("una alcantarilla bloqueada en la calle principal del área norte, donde el agua se acumula cada vez que llueve") } },
  },
  {
    type: "report",
    categoryId: "flooding-drainage",
    areaId: "norte",
    areaLabel: "Northern area",
    areaLabelEs: "Área norte",
    description:
      "El drenaje de la avenida norte sigue tapado, se forma un charco grande después de cada lluvia.",
    daysAgo: 8,
    status: "received",
    agent: { referral: { urgency: "medium", message: DEMO_MESSAGE("un drenaje tapado en la avenida norte, que forma un charco grande después de cada lluvia") } },
  },
  {
    type: "report",
    categoryId: "flooding-drainage",
    areaId: "norte",
    areaLabel: "Northern area",
    areaLabelEs: "Área norte",
    description:
      "Inundación recurrente en el área norte por el mismo drenaje bloqueado, ya pasó tres veces este mes.",
    daysAgo: 2,
    status: "received",
    agent: { referral: { urgency: "high", message: DEMO_MESSAGE("inundaciones repetidas en el área norte por el mismo drenaje bloqueado, tres veces este mes") } },
  },
  // A case with a status change already applied — exercises the auto-drafted status explanation.
  {
    type: "report",
    categoryId: "garbage-sanitation",
    areaId: "sur",
    areaLabel: "Southern area",
    areaLabelEs: "Área sur",
    description: "Acumulación de basura sin recoger en el área sur desde hace dos semanas.",
    daysAgo: 11,
    status: "received",
    secondStatus: "in_progress",
    agent: {},
  },
  // A proposal, and a closed case — variety for the general admin/case list.
  {
    type: "proposal",
    categoryId: "other",
    areaId: "este",
    areaLabel: "Eastern area",
    areaLabelEs: "Área este",
    description: "Propongo instalar más luminarias solares en el parque del área este.",
    daysAgo: 4,
    status: "under_review",
    agent: {},
  },
  {
    type: "report",
    categoryId: "road-infrastructure",
    areaId: "oeste",
    areaLabel: "Western area",
    areaLabelEs: "Área oeste",
    description: "Bache grande en la vía principal del área oeste, ya provocó un accidente menor.",
    daysAgo: 25,
    status: "closed",
  },
];

/** The status a case's first moderator change sets, and how many days after the report it happened. */
function demoStatusChange(seed: DemoCaseSeed): { status: ReportStatus; afterDays: number } | null {
  if (seed.secondStatus) return { status: seed.secondStatus, afterDays: 4 };
  if (seed.status !== "received") return { status: seed.status, afterDays: 2 };
  return null;
}

export type DemoAgentStep = {
  kind: Exclude<TimelineEventKind, "status">;
  actorType: "agent" | "moderator";
  /** Minutes after the report was created. */
  minutesAfter: number;
  contactId?: string;
  /** The case's status once this step is recorded. */
  status: ReportStatus;
};

const MINUTES_PER_DAY = 24 * 60;

/**
 * The public timeline entries the agent (and, for an approved referral, a moderator) added to a
 * demonstration case — the same entries the real pipeline writes (guide/referral/pipeline.ts).
 * One list for the in-memory store, db/seed.sql and the migration that adds them to databases
 * seeded before the agent existed.
 */
export function demoAgentSteps(seed: DemoCaseSeed): DemoAgentStep[] {
  if (!seed.agent) return [];
  const change = demoStatusChange(seed);
  const statusAt = (minutes: number): ReportStatus =>
    change && minutes >= change.afterDays * MINUTES_PER_DAY ? change.status : "received";
  const steps: DemoAgentStep[] = [{ kind: "ai_reviewed", actorType: "agent", minutesAfter: 3, status: statusAt(3) }];
  const referral = seed.agent.referral;
  if (!referral) return steps;
  const office = DEMO_REFERRAL_OFFICE;
  steps.push(
    { kind: "referral_prepared", actorType: "agent", minutesAfter: 4, contactId: office, status: statusAt(4) },
    { kind: "awaiting_approval", actorType: "agent", minutesAfter: 4, contactId: office, status: statusAt(4) },
  );
  if (referral.approvedAfterDays !== undefined) {
    steps.push({
      kind: "referral_approved",
      actorType: "moderator",
      minutesAfter: referral.approvedAfterDays * MINUTES_PER_DAY,
      contactId: office,
      status: "referred",
    });
  }
  return steps;
}

/** A demonstration case's status once all its seeded history is applied. */
export function demoFinalStatus(seed: DemoCaseSeed): ReportStatus {
  const approved = seed.agent?.referral?.approvedAfterDays;
  const change = demoStatusChange(seed);
  if (approved !== undefined && (!change || approved >= change.afterDays)) return "referred";
  return change?.status ?? "received";
}
