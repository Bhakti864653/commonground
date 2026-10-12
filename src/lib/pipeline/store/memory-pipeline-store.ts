import {
  AuditEntrySchema,
  CasePipelineStateSchema,
  OutboxItemSchema,
  ProposalSchema,
  type AuditEntry,
  type CasePipelineState,
  type OutboxItem,
  type Proposal,
} from "../types";
import type { PipelineRepository } from "./pipeline-repository";
import { DEMO_PIPELINE_RECORDS, DEMO_MODERATOR, fillPlaceholders } from "./demo-pipeline-records";
import { listAllCasesForAdmin as listMemoryCases } from "@/lib/store/memory-case-store";
import { publicCaseUrl } from "@/lib/site-url";

type State = {
  states: Map<string, CasePipelineState>;
  proposals: Proposal[];
  outbox: OutboxItem[];
  audit: AuditEntry[];
};

/** On globalThis for the same reason as the in-memory case store (survives dev hot reloads). */
function getStore(): State {
  const g = globalThis as typeof globalThis & { __commonGroundPipelineStore__?: State };
  if (!g.__commonGroundPipelineStore__) {
    g.__commonGroundPipelineStore__ = { states: new Map(), proposals: [], outbox: [], audit: [] };
    seedDemoPipeline(g.__commonGroundPipelineStore__);
  }
  return g.__commonGroundPipelineStore__;
}

const copy = <T>(value: T): T => structuredClone(value);

const daysAgoIso = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

/** The demonstration cases' example pipeline history (demo-pipeline-data.ts). */
function seedDemoPipeline(store: State): void {
  const demoCases = listMemoryCases().filter((c) => c.sourceType === "demonstration");
  const numberOf = (description: string) => demoCases.find((c) => c.description === description)?.publicCaseNumber;
  for (const raw of DEMO_PIPELINE_RECORDS) {
    const caseNumber = numberOf(raw.description);
    if (!caseNumber) continue;
    const found = demoCases.find((c) => c.publicCaseNumber === caseNumber)!;
    const r = fillPlaceholders(raw, caseNumber, publicCaseUrl(caseNumber), raw.duplicateDescriptions.map((d) => numberOf(d) ?? ""));
    const s = r.state;
    store.states.set(
      caseNumber,
      CasePipelineStateSchema.parse({
        caseNumber,
        communityId: found.communityId,
        emergency: false,
        officeId: s.officeId,
        priority: s.priority,
        routedAt: s.routedDaysAgo === undefined ? undefined : daysAgoIso(s.routedDaysAgo),
        referralQueuedAt: s.referralQueuedDaysAgo === undefined ? undefined : daysAgoIso(s.referralQueuedDaysAgo),
        lastFollowUpAt: s.lastFollowUpDaysAgo === undefined ? undefined : daysAgoIso(s.lastFollowUpDaysAgo),
        lastProgressAt: daysAgoIso(s.lastProgressDaysAgo),
      }),
    );
    for (const p of r.proposals) {
      store.proposals.push(
        ProposalSchema.parse({
          id: crypto.randomUUID(),
          kind: p.kind,
          caseNumber,
          communityId: found.communityId,
          status: p.status,
          createdAt: daysAgoIso(p.createdDaysAgo),
          ...(p.reviewedDaysAgo === undefined ? {} : { reviewedAt: daysAgoIso(p.reviewedDaysAgo), reviewedBy: DEMO_MODERATOR }),
          payload: p.payload,
          critique: p.critique,
        }),
      );
    }
    for (const o of r.outbox) {
      const { daysAgo, ...item } = o;
      store.outbox.push(
        OutboxItemSchema.parse({ ...item, id: crypto.randomUUID(), caseNumber, communityId: found.communityId, status: "dry_run", createdAt: daysAgoIso(daysAgo), approvedBy: DEMO_MODERATOR }),
      );
    }
    for (const a of r.audit) {
      const { daysAgo, ...entry } = a;
      store.audit.push(AuditEntrySchema.parse({ ...entry, id: crypto.randomUUID(), caseNumber, communityId: found.communityId, occurredAt: daysAgoIso(daysAgo) }));
    }
  }
}

export const memoryPipelineRepository: PipelineRepository = {
  async getState(caseNumber) {
    return copy(getStore().states.get(caseNumber));
  },
  async listStates() {
    return copy([...getStore().states.values()]);
  },
  async upsertState(caseNumber, communityId, patch) {
    const store = getStore();
    const current = store.states.get(caseNumber) ?? { caseNumber, communityId, emergency: false };
    const next = CasePipelineStateSchema.parse({ ...current, ...patch, caseNumber, communityId: current.communityId });
    store.states.set(caseNumber, next);
    return copy(next);
  },

  async addProposal(proposal, now = new Date()) {
    const store = getStore();
    store.proposals = store.proposals.filter(
      (p) =>
        !(
          p.status === "pending" &&
          p.kind === proposal.kind &&
          (proposal.kind === "weekly_summary" ? p.communityId === proposal.communityId : p.caseNumber === proposal.caseNumber)
        ),
    );
    const created = ProposalSchema.parse({ ...proposal, id: crypto.randomUUID(), status: "pending", createdAt: now.toISOString() });
    store.proposals.push(created);
    return copy(created);
  },
  async getProposal(id) {
    return copy(getStore().proposals.find((p) => p.id === id));
  },
  async listProposals(filter = {}) {
    return copy(
      getStore()
        .proposals.filter(
          (p) =>
            (filter.caseNumber === undefined || p.caseNumber === filter.caseNumber) &&
            (filter.kind === undefined || p.kind === filter.kind) &&
            (filter.status === undefined || p.status === filter.status) &&
            (filter.communityId === undefined || p.communityId === filter.communityId),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },
  async reviewProposal(id, status, reviewedBy, payload, now = new Date()) {
    const found = getStore().proposals.find((p) => p.id === id);
    if (!found || found.status !== "pending") return null;
    const next = ProposalSchema.parse({ ...found, status, reviewedBy, reviewedAt: now.toISOString(), payload: payload ?? found.payload });
    Object.assign(found, next);
    return copy(next);
  },

  async addOutboxItem(item, now = new Date()) {
    const created = OutboxItemSchema.parse({ ...item, id: crypto.randomUUID(), status: "dry_run", createdAt: now.toISOString() });
    getStore().outbox.push(created);
    return copy(created);
  },
  async listOutbox(filter = {}) {
    return copy(
      getStore()
        .outbox.filter((o) => filter.caseNumber === undefined || o.caseNumber === filter.caseNumber)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },

  async addAudit(entry, now = new Date()) {
    const created = AuditEntrySchema.parse({ ...entry, id: crypto.randomUUID(), occurredAt: now.toISOString() });
    getStore().audit.push(created);
    return copy(created);
  },
  async listAudit(filter = {}) {
    const entries = getStore()
      .audit.filter((a) => filter.caseNumber === undefined || a.caseNumber === filter.caseNumber)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return copy(filter.limit ? entries.slice(0, filter.limit) : entries);
  },
};

/** Test-only: back to empty (and not re-seeded). */
export function __resetMemoryPipelineStore(): void {
  const g = globalThis as typeof globalThis & { __commonGroundPipelineStore__?: State };
  g.__commonGroundPipelineStore__ = { states: new Map(), proposals: [], outbox: [], audit: [] };
}
