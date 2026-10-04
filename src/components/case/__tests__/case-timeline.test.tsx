import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/store/actions", () => ({ reportInaccuracy: vi.fn(), deleteSubmission: vi.fn() }));

import { CaseView } from "@/components/case/CaseView";
import { LanguageProvider } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";
import { STATUS_LABELS, type PublicCase } from "@/lib/schema/report";
import { SANTIAGO_VERAGUAS } from "@/data/communities";

const f = FIELD.caseView;
const office = SANTIAGO_VERAGUAS.officialContacts.find((c) => c.id === "alcaldia-santiago-oficina")!;

const caseData: PublicCase = {
  id: "1",
  type: "report",
  publicCaseNumber: "SV-2026-0009",
  communityId: SANTIAGO_VERAGUAS.id,
  categoryId: "garbage-sanitation",
  description: "No pasa el camión de la basura.",
  approximateArea: { kind: "neighborhood", areaId: "centro", label: "Central area", labelEs: "Área central" },
  createdAt: "2026-10-01T10:00:00Z",
  status: "referred",
  statusHistory: [
    { id: "a", status: "received", occurredAt: "2026-10-01T10:00:00Z", actorType: "system" },
    { id: "b", status: "received", occurredAt: "2026-10-01T10:00:05Z", actorType: "agent", kind: "ai_reviewed" },
    { id: "c", status: "received", occurredAt: "2026-10-01T10:00:09Z", actorType: "agent", kind: "referral_prepared", contactId: office.id },
    { id: "d", status: "received", occurredAt: "2026-10-01T10:00:09Z", actorType: "agent", kind: "awaiting_approval", contactId: office.id },
    { id: "e", status: "referred", occurredAt: "2026-10-02T09:00:00Z", actorType: "moderator", kind: "referral_approved", contactId: office.id },
  ],
  sourceType: "community",
  verificationState: "community_report",
  consent: { consentVersion: "v1", consentedAt: "2026-10-01T10:00:00Z", language: "es" },
};

function renderInSpanish(data: PublicCase = caseData, offices = [office]) {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["es-PA"]);
  return render(
    <LanguageProvider>
      <CaseView caseData={data} category={SANTIAGO_VERAGUAS.categories[1]} communityDisplayName="Santiago de Veraguas" isNew={false} managementToken={null} offices={offices} />
    </LanguageProvider>,
  );
}

const officeEs = office.nameEs ?? office.name;

describe("case timeline with referral steps", () => {
  it("shows each AI step with fixed text and the office name in the reader's language", () => {
    renderInSpanish();
    expect(screen.getByRole("heading", { name: f.eventKinds.ai_reviewed.es })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: f.eventKinds.referral_prepared.es.replace("{office}", officeEs) })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: f.eventKinds.awaiting_approval.es })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: f.eventKinds.referral_approved.es.replace("{office}", officeEs) })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: STATUS_LABELS.received.es })).toBeInTheDocument();
  });

  it("labels AI entries with a text label (not just an icon) and explains nothing is sent automatically", () => {
    renderInSpanish();
    expect(screen.getAllByText(f.byAgent.es)).toHaveLength(3);
    expect(screen.getAllByText(f.agentNote.es)).toHaveLength(3);
    expect(screen.getByText(f.byModerator.es)).toBeInTheDocument();
  });

  it("falls back to a generic office name if the office was removed", () => {
    renderInSpanish(caseData, []);
    expect(
      screen.getByRole("heading", { name: f.eventKinds.referral_prepared.es.replace("{office}", f.officeFallback.es) }),
    ).toBeInTheDocument();
  });
});
