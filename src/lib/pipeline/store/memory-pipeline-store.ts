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
import { DEMO_PIPELINE_RECORDS, materializeDemoPipeline } from "./demo-pipeline-records";
import type { Case } from "@/lib/schema/report";
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

/** Writes the example pipeline records for the given demonstration cases into the store. */
function writeDemoPipeline(store: State, demoCases: Case[]): void {
  const numberOf = (description: string) => demoCases.find((c) => c.description === description)?.publicCaseNumber ?? "";
  for (const record of DEMO_PIPELINE_RECORDS) {
    const target = demoCases.find((c) => c.description === record.description);
    if (!target) continue;
    const rows = materializeDemoPipeline(record, {
      caseNumber: target.publicCaseNumber,
      communityId: target.communityId,
      createdAt: target.createdAt,
      caseUrl: publicCaseUrl(target.publicCaseNumber),
      duplicateNumbers: record.duplicateDescriptions.map(numberOf),
    });
    store.states.set(target.publicCaseNumber, rows.state);
    store.proposals.push(...rows.proposals);
    store.outbox.push(...rows.outbox);
    store.audit.push(...rows.audit);
  }
}

/** The demonstration cases' example pipeline history (demo-pipeline-data.ts). */
function seedDemoPipeline(store: State): void {
  writeDemoPipeline(store, listMemoryCases().filter((c) => c.sourceType === "demonstration"));
}

/**
 * "Reset demo", pipeline half: removes every pipeline record of exactly these demonstration
 * cases (state, proposals, outbox, audit) and writes their example history again. Records of any
 * other case are never touched.
 */
export function resetDemoPipelineInMemory(demoCases: Case[]): void {
  const store = getStore();
  const numbers = new Set(demoCases.map((c) => c.publicCaseNumber));
  for (const n of numbers) store.states.delete(n);
  store.proposals = store.proposals.filter((p) => !p.caseNumber || !numbers.has(p.caseNumber));
  store.outbox = store.outbox.filter((o) => !o.caseNumber || !numbers.has(o.caseNumber));
  store.audit = store.audit.filter((a) => !a.caseNumber || !numbers.has(a.caseNumber));
  writeDemoPipeline(store, demoCases);
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
