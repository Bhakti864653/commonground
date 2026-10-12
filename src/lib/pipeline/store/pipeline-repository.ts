import type {
  AuditEntry,
  CasePipelineState,
  NewProposal,
  OutboxItem,
  Proposal,
  ProposalKind,
} from "../types";

/**
 * Where the agentic pipeline keeps its records. Two implementations, like cases: in memory
 * (tests, and when no database is configured) and Postgres (db/migrations/0007_agentic_pipeline.sql).
 * pipeline-repository-contract.test.ts runs the same tests against both.
 */
export interface PipelineRepository {
  getState(caseNumber: string): Promise<CasePipelineState | undefined>;
  listStates(): Promise<CasePipelineState[]>;
  /** Creates the row if needed and merges `patch` into it. */
  upsertState(caseNumber: string, communityId: string, patch: Partial<Omit<CasePipelineState, "caseNumber" | "communityId">>): Promise<CasePipelineState>;

  /**
   * Adds a pending proposal. An older pending proposal of the same kind for the same case (or,
   * for a weekly summary, the same community) is replaced, so re-running an agent doesn't pile up.
   */
  addProposal(proposal: NewProposal, now?: Date): Promise<Proposal>;
  getProposal(id: string): Promise<Proposal | undefined>;
  listProposals(filter?: { caseNumber?: string; kind?: ProposalKind; status?: Proposal["status"]; communityId?: string }): Promise<Proposal[]>;
  /**
   * Marks a pending proposal approved or rejected (optionally saving the moderator's edits to its
   * payload). Returns the updated proposal, or null if it wasn't pending.
   */
  reviewProposal(
    id: string,
    status: "approved" | "rejected",
    reviewedBy: string,
    payload?: Proposal["payload"],
    now?: Date,
  ): Promise<Proposal | null>;

  addOutboxItem(item: Omit<OutboxItem, "id" | "createdAt" | "status">, now?: Date): Promise<OutboxItem>;
  listOutbox(filter?: { caseNumber?: string }): Promise<OutboxItem[]>;

  addAudit(entry: Omit<AuditEntry, "id" | "occurredAt">, now?: Date): Promise<AuditEntry>;
  listAudit(filter?: { caseNumber?: string; limit?: number }): Promise<AuditEntry[]>;
}
