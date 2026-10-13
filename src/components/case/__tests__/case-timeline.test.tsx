import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/store/actions", () => ({ reportInaccuracy: vi.fn(), deleteSubmission: vi.fn() }));

import { CaseView } from "@/components/case/CaseView";
import { LanguageProvider } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";
import { STATUS_LABELS, toPublicCase, type Case, type PublicCase } from "@/lib/schema/report";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import { REFERRAL_OFFICES } from "@/data/referral-offices";

const f = FIELD.caseView;
const office = SANTIAGO_VERAGUAS.officialContacts.find((c) => c.id === "alcaldia-santiago-oficina")!;

/**
 * Everything the earlier and the current pipeline ever wrote on a timeline, on one case — the
 * shape SV-2026-0011 had before migration 0009 moved its AI/referral entries to the audit log.
 */
const everyKind: Case["statusHistory"] = [
  { id: "a", status: "received", occurredAt: "2026-10-10T10:00:00Z", actorType: "system" },
  { id: "b", status: "received", occurredAt: "2026-10-10T10:00:05Z", actorType: "agent", kind: "ai_reviewed" },
  { id: "c", status: "received", occurredAt: "2026-10-10T10:00:09Z", actorType: "agent", kind: "referral_prepared", contactId: office.id },
  { id: "d", status: "received", occurredAt: "2026-10-10T10:00:09Z", actorType: "agent", kind: "awaiting_approval", contactId: office.id },
  { id: "e", status: "received", occurredAt: "2026-10-11T09:00:00Z", actorType: "moderator", kind: "referral_declined", contactId: office.id },
  { id: "f", status: "received", occurredAt: "2026-10-12T09:00:00Z", actorType: "moderator", kind: "referral_approved", contactId: office.id },
  { id: "g", status: "received", occurredAt: "2026-10-12T10:00:00Z", actorType: "moderator", kind: "referral_queued" },
  { id: "h", status: "received", occurredAt: "2026-10-12T11:00:00Z", actorType: "office", kind: "office_received" },
  { id: "i", status: "received", occurredAt: "2026-10-12T12:00:00Z", actorType: "office", kind: "office_note", noteEs: "Nota de Obras públicas y vías" },
  { id: "j", status: "received", occurredAt: "2026-10-12T13:00:00Z", actorType: "moderator", kind: "follow_up_update", noteEs: "La IA preparó una actualización" },
];

function caseWith(sourceType: "community" | "demonstration"): Case {
  return {
    id: "1",
    type: "report",
    publicCaseNumber: sourceType === "community" ? "SV-2026-0011" : "SV-2026-0001",
    communityId: SANTIAGO_VERAGUAS.id,
    categoryId: "garbage-sanitation",
    description: "No pasa el camión de la basura.",
    approximateArea: { kind: "neighborhood", areaId: "centro", label: "Central area", labelEs: "Área central" },
    createdAt: "2026-10-10T10:00:00Z",
    status: "received",
    statusHistory: everyKind,
    sourceType,
    verificationState: sourceType === "community" ? "community_report" : "demonstration_data",
    consent: { consentVersion: "v1", consentedAt: "2026-10-10T10:00:00Z", language: "es" },
    adminNotes: [],
    inaccuracyFlags: [],
    moderationActions: [],
    agentSuggestions: [],
    managementToken: "token",
  };
}

function renderInSpanish(data: PublicCase) {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["es-PA"]);
  return render(
    <LanguageProvider>
      <CaseView caseData={data} category={SANTIAGO_VERAGUAS.categories[1]} communityDisplayName="Santiago de Veraguas" isNew={false} managementToken={null} offices={[office]} />
    </LanguageProvider>,
  );
}

describe("a resident's (real) case page", () => {
  it("shows only resident-facing statuses — no AI, referral, office or Alcaldía entry", () => {
    const { container } = renderInSpanish(toPublicCase(caseWith("community")));
    const timeline = container.querySelector("ol")!;
    expect([...timeline.querySelectorAll("h3")].map((h) => h.textContent)).toEqual([STATUS_LABELS.received.es]);
    const page = container.textContent ?? "";
    for (const forbidden of [
      "La IA",
      "IA de CommonGround",
      "remisión",
      "Remisión",
      "Esperando la aprobación",
      "Alcaldía",
      office.name,
      office.nameEs ?? office.name,
      "oficina responsable",
      "Oficina simulada",
      ...REFERRAL_OFFICES.map((o) => o.nameEs),
    ]) {
      expect(page, `"${forbidden}" must not appear`).not.toContain(forbidden);
    }
  });

  it("hides them even if a caller forgets toPublicCase (the page applies the same rule)", () => {
    const { container } = renderInSpanish(caseWith("community"));
    expect([...container.querySelectorAll("ol h3")].map((h) => h.textContent)).toEqual([STATUS_LABELS.received.es]);
    expect(container.textContent).not.toContain("Alcaldía");
  });

  it("never sends the hidden entries to the browser at all", () => {
    const json = JSON.stringify(toPublicCase(caseWith("community")));
    expect(json).not.toContain(office.id);
    expect(json).not.toMatch(/ai_reviewed|referral_|awaiting_approval|office_|follow_up_update/);
  });
});

describe("an example case page", () => {
  it("shows the pipeline's moderator-approved steps, but never the earlier automatic AI entries or an office name", () => {
    const { container } = renderInSpanish(toPublicCase(caseWith("demonstration")));
    const headings = [...container.querySelectorAll("ol h3")].map((h) => h.textContent);
    expect(headings).toContain(f.eventKinds.referral_queued.es);
    expect(headings).toContain(f.eventKinds.follow_up_update.es);
    expect(headings).toContain(f.eventKinds.office_received.es);
    expect(headings).not.toContain(f.eventKinds.ai_reviewed.es);
    expect(headings.some((h) => h?.includes("Alcaldía"))).toBe(false);
    expect(screen.getAllByText(f.bySimulatedOffice.es).length).toBeGreaterThan(0);
  });
});

