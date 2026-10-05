import type { ReportStatus } from "@/lib/schema/report";

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
