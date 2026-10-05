import { CaseSchema, MAX_DESCRIPTION_LENGTH, type ApproximateArea, type Case, type UserConsent } from "@/lib/schema/report";
import { getCommunity as getCommunityById } from "@/lib/store/community-store";
import { validateImageMetadata } from "@/lib/privacy/image-validation";

export type NewCaseInput = {
  type: "report" | "proposal";
  communityId: string;
  categoryId: string;
  description: string;
  approximateArea: ApproximateArea;
  consent: UserConsent;
  image?: Case["image"];
};

/**
 * Checks a new submission and builds the case every store saves — everything except its public
 * number, which each store assigns its own way (an in-memory counter, or the database's
 * create_case function). Shared so both stores accept and reject exactly the same input.
 * Throws on anything invalid; a server action can be called with any input at all.
 */
export function prepareNewCase(input: NewCaseInput, createdAt: Date): Omit<Case, "publicCaseNumber"> {
  const community = getCommunityById(input.communityId);
  if (!community) {
    throw new Error(`Unknown community: ${input.communityId}`);
  }

  // A category the community doesn't have would create a case whose public page can never
  // render (it looks the category up to show it).
  if (!community.categories.some((c) => c.id === input.categoryId)) {
    throw new Error(`Unknown category for ${input.communityId}: ${input.categoryId}`);
  }
  if (typeof input.description !== "string" || input.description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`);
  }

  // Defense in depth — the wizard already checks this client-side, but a server action can be
  // called directly with fabricated metadata, so this can't be the only check (PRIVACY.md).
  if (input.image) {
    const result = validateImageMetadata(input.image);
    if (!result.valid) {
      throw new Error(`Invalid image metadata: ${result.reason}`);
    }
  }

  const nowIso = createdAt.toISOString();
  const candidate: Case = {
    id: crypto.randomUUID(),
    type: input.type,
    publicCaseNumber: "",
    communityId: input.communityId,
    categoryId: input.categoryId,
    description: input.description,
    approximateArea: input.approximateArea,
    createdAt: nowIso,
    status: "received",
    statusHistory: [{ id: crypto.randomUUID(), status: "received", occurredAt: nowIso, actorType: "system" }],
    sourceType: community.status === "demo" ? "demonstration" : "community",
    verificationState: community.status === "demo" ? "demonstration_data" : "community_report",
    image: input.image,
    consent: input.consent,
    adminNotes: [],
    inaccuracyFlags: [],
    moderationActions: [],
    agentSuggestions: [],
    managementToken: crypto.randomUUID(),
  };

  // Nothing bypasses schema validation on write (ARCHITECTURE.md) — this both double-checks
  // every field the wizard assembled and normalizes defaults.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the number is assigned by the store
  const { publicCaseNumber, ...validated } = CaseSchema.parse(candidate);
  return validated;
}
