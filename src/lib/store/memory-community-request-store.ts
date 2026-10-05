import {
  MAX_STORED_REQUESTS,
  buildCommunityRequest,
  summarizeCommunityRequests,
  type CommunityRequest,
  type CommunityRequestSummary,
} from "./community-request-logic";

export * from "./community-request-logic";

/**
 * The in-memory store for "Ask for CommonGround in your community" requests (rules in
 * community-request-logic.ts). Same prototype persistence as the other in-memory stores
 * (globalThis, lost on restart/redeploy); production uses Postgres instead.
 */
type State = { requests: CommunityRequest[] };

function getStore(): State {
  const g = globalThis as typeof globalThis & { __commonGroundCommunityRequests__?: State };
  return (g.__commonGroundCommunityRequests__ ??= { requests: [] });
}

export function recordCommunityRequest(rawInput: unknown, now: Date = new Date()): boolean {
  const request = buildCommunityRequest(rawInput, now);
  if (!request) return false;
  const store = getStore();
  store.requests.push(request);
  if (store.requests.length > MAX_STORED_REQUESTS) {
    store.requests.splice(0, store.requests.length - MAX_STORED_REQUESTS);
  }
  return true;
}

/** Grouped by place, most-requested first — what a moderator needs to decide where to set up next. */
export function listCommunityRequestSummaries(): CommunityRequestSummary[] {
  return summarizeCommunityRequests(getStore().requests);
}

/** Test-only reset. */
export function __resetCommunityRequestsForTests(): void {
  getStore().requests = [];
}
