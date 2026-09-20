import type Groq from "groq-sdk";
import { getCaseByCaseNumber, listOpenCasesForCommunity } from "@/lib/store/case-store";
import { getCommunityById } from "@/data/communities";

/**
 * Shared by both Guide surfaces (admin case-analysis and the resident chat). Every tool is
 * read-only and returns only public-safe fields — never `adminNotes`, `moderationActions`, or
 * `managementToken` — since the resident chat reuses these too and must never leak private
 * data (PRIVACY.md: "reveal private user information" is on the Guide's never-do list).
 */
export const TOOL_DEFINITIONS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_similar_cases",
      description:
        "List other open (non-duplicate) cases in the same community, to check whether the " +
        "case being analyzed is a likely duplicate of an existing one.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_case_details",
      description: "Get the full public details of one specific case by its case number.",
      parameters: {
        type: "object",
        properties: {
          caseNumber: { type: "string", description: "e.g. SV-2026-0001" },
        },
        required: ["caseNumber"],
        additionalProperties: false,
      },
    },
  },
];

type ToolContext = {
  communityId: string;
  excludeCaseNumber?: string;
};

function summarizeCase(c: ReturnType<typeof getCaseByCaseNumber>) {
  if (!c) return null;
  return {
    caseNumber: c.publicCaseNumber,
    type: c.type,
    categoryId: c.categoryId,
    description: c.description,
    approximateArea: c.approximateArea.label,
    status: c.status,
    verificationState: c.verificationState,
    createdAt: c.createdAt,
  };
}

export async function executeTool(
  name: string,
  rawArguments: string,
  context: ToolContext,
): Promise<unknown> {
  switch (name) {
    case "search_similar_cases": {
      const cases = listOpenCasesForCommunity(context.communityId, context.excludeCaseNumber);
      return { cases: cases.map(summarizeCase) };
    }
    case "get_case_details": {
      let caseNumber: string | undefined;
      try {
        caseNumber = JSON.parse(rawArguments)?.caseNumber;
      } catch {
        return { error: "Invalid arguments" };
      }
      if (!caseNumber) return { error: "Missing caseNumber" };
      const found = getCaseByCaseNumber(caseNumber);
      if (!found || found.communityId !== context.communityId) {
        return { error: "Case not found in this community" };
      }
      return { case: summarizeCase(found) };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export function communityContextBlock(communityId: string): string {
  const community = getCommunityById(communityId);
  if (!community) return "";
  const categories = community.categories.map((c) => `${c.id}: ${c.label}`).join(", ");
  return `Active community: ${community.displayName}, ${community.country}. Valid category ids: ${categories}.`;
}
