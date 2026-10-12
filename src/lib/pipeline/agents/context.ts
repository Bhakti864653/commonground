import type { Case } from "@/lib/schema/report";
import type { CommunityConfig } from "@/lib/schema/community";
import { REFERRAL_OFFICES } from "@/data/referral-offices";
import { jaccardSimilarity } from "@/lib/insights/duplicate-clusters";
import { getCaseByCaseNumber, listOpenCasesForCommunity } from "@/lib/store/case-store";
import { redactPersonalInfo } from "../redact";
import { untrustedBlock } from "../untrusted";
import type { ReadTool } from "../agent-runner";

/**
 * What agents are allowed to see about a case: public fields only, the description redacted
 * once more (older cases were saved before the privacy filter existed) and wrapped as untrusted
 * resident text. Never the management token, notes, moderation history or flags.
 */
export function caseFacts(c: Case, community: CommunityConfig | undefined, now: Date) {
  const category = community?.categories.find((x) => x.id === c.categoryId);
  const area = c.approximateArea.kind === "prefer_not_to_say" ? "not given" : c.approximateArea.label;
  const areaEs = c.approximateArea.kind === "prefer_not_to_say" ? "zona no indicada" : (c.approximateArea.labelEs ?? c.approximateArea.label);
  return {
    caseNumber: c.publicCaseNumber,
    type: c.type,
    categoryId: c.categoryId,
    category: category?.label ?? c.categoryId,
    categoryEs: category?.labelEs ?? c.categoryId,
    area,
    areaEs,
    community: community ? `${community.displayName}, ${community.country}` : c.communityId,
    status: c.status,
    daysOpen: Math.max(0, Math.floor((now.getTime() - Date.parse(c.createdAt)) / 86_400_000)),
    description: redactPersonalInfo(c.description).text,
  };
}

export function caseBlock(c: Case, community: CommunityConfig | undefined, now: Date): string {
  const { description, ...rest } = caseFacts(c, community, now);
  return `Case (public fields): ${JSON.stringify(rest)}\nDescription:\n${untrustedBlock("resident's description", description)}`;
}

export function officeListForPrompt(): string {
  return REFERRAL_OFFICES.map((o) => `- ${o.id}: ${o.name}. Handles: ${o.handles}`).join("\n");
}

/** How many residents reported this problem: the case itself plus cases merged into it. */
export async function residentCount(c: Case): Promise<number> {
  const others = await listOpenCasesForCommunity(c.communityId);
  return 1 + others.filter((o) => o.isDuplicateOf === c.publicCaseNumber).length;
}

export type SimilarCase = { caseNumber: string; score: number; category: string; area: string; daysOpen: number; description: string };

/** Open cases in the same community, most similar first (word overlap, no AI). */
export async function findSimilarCases(c: Case, now: Date, limit = 5): Promise<SimilarCase[]> {
  const others = await listOpenCasesForCommunity(c.communityId, c.publicCaseNumber);
  return others
    .map((o) => ({
      caseNumber: o.publicCaseNumber,
      score: Math.round(jaccardSimilarity(c.description, o.description) * 100) / 100,
      sameCategory: o.categoryId === c.categoryId,
      sameArea: o.approximateArea.areaId !== undefined && o.approximateArea.areaId === c.approximateArea.areaId,
      category: o.categoryId,
      area: o.approximateArea.label,
      daysOpen: Math.max(0, Math.floor((now.getTime() - Date.parse(o.createdAt)) / 86_400_000)),
      description: redactPersonalInfo(o.description).text.slice(0, 300),
    }))
    .map(({ sameCategory, sameArea, ...rest }) => ({ ...rest, score: Math.min(1, rest.score + (sameCategory ? 0.05 : 0) + (sameArea ? 0.05 : 0)) }))
    .filter((s) => s.score >= 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Likely duplicates: similar enough in the same community to suggest merging. */
export const DUPLICATE_THRESHOLD = 0.3;

/** The read-only tools every case agent may call. Results are public-safe and size-bounded. */
export function caseReadTools(c: Case, now: Date): ReadTool[] {
  return [
    {
      name: "searchSimilarCases",
      description: "List open cases in the same community that look similar to this one, with a similarity score (0-1). Use it to spot duplicates.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      run: async () => ({ cases: (await findSimilarCases(c, now)).map((s) => ({ ...s, description: untrustedBlock("resident's description", s.description) })) }),
    },
    {
      name: "getCase",
      description: "Get the public details of one case in this community by its case number (e.g. SV-2026-0001).",
      parameters: {
        type: "object",
        properties: { caseNumber: { type: "string" } },
        required: ["caseNumber"],
        additionalProperties: false,
      },
      run: async (args) => {
        const caseNumber = (args as { caseNumber?: unknown })?.caseNumber;
        if (typeof caseNumber !== "string") return { error: "caseNumber is required" };
        const found = await getCaseByCaseNumber(caseNumber);
        if (!found || found.communityId !== c.communityId || found.removal) return { error: "No such case in this community" };
        return {
          caseNumber: found.publicCaseNumber,
          categoryId: found.categoryId,
          area: found.approximateArea.label,
          status: found.status,
          daysOpen: Math.max(0, Math.floor((now.getTime() - Date.parse(found.createdAt)) / 86_400_000)),
          description: untrustedBlock("resident's description", redactPersonalInfo(found.description).text.slice(0, 600)),
        };
      },
    },
  ];
}
