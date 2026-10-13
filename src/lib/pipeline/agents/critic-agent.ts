import type Groq from "groq-sdk";
import { z } from "zod";
import type { Case } from "@/lib/schema/report";
import type { CommunityConfig } from "@/lib/schema/community";
import { getReferralOffice } from "@/data/referral-offices";
import { LANGUAGE_CODES } from "@/lib/i18n/languages";
import { publicCaseUrl } from "@/lib/site-url";
import { runToolAgent } from "../agent-runner";
import { containsPersonalInfo } from "../redact";
import { MIN_CONFIDENCE } from "../routing-rules";
import { UNTRUSTED_DATA_RULE } from "../untrusted";
import { CritiqueIssueSchema, CritiqueSchema, type Critique, type NewProposal } from "../types";
import { caseBlock } from "./context";
import { checkOutgoingMessage } from "./referral-agent";

/**
 * Critic Agent: reviews another agent's output before a moderator sees it, looking for mistakes,
 * bias, missing information and personal data. Two layers: code checks that never depend on the
 * AI (personal data, required facts, valid office), then the AI's own review. The critique is
 * advice shown on the moderator's card — it never approves or blocks anything by itself.
 */

type Issue = z.infer<typeof CritiqueIssueSchema>;

/** The checks that run with or without the AI. */
export function ruleChecks(proposal: Pick<NewProposal, "kind" | "payload" | "caseNumber">): Issue[] {
  const issues: Issue[] = [];
  const p = proposal.payload;
  switch (proposal.kind) {
    case "routing": {
      const r = p as Extract<NewProposal, { kind: "routing" }>["payload"];
      if (!getReferralOffice(r.officeId)) issues.push({ type: "mistake", note: `Unknown office "${r.officeId}".` });
      if (r.confidence < MIN_CONFIDENCE) issues.push({ type: "missing_info", note: `Low confidence (${Math.round(r.confidence * 100)}%): a moderator should choose the office.` });
      if (r.alternativeOfficeIds.length) issues.push({ type: "missing_info", note: `Other offices could also fit: ${r.alternativeOfficeIds.join(", ")}.` });
      if (r.possibleDuplicates.some((d) => d.score >= 0.5)) issues.push({ type: "other", note: "This looks like a duplicate of an open case — consider merging instead of routing it again." });
      if (r.injectionSuspected) issues.push({ type: "other", note: "The report contains text that looks like instructions to the AI. It was treated as plain data; check the routing yourself." });
      break;
    }
    case "referral": {
      const r = p as Extract<NewProposal, { kind: "referral" }>["payload"];
      if (proposal.caseNumber) {
        const check = checkOutgoingMessage(r.messageEs, proposal.caseNumber, publicCaseUrl(proposal.caseNumber));
        if (!check.ok) issues.push({ type: check.reason.includes("personal") ? "personal_data" : "mistake", note: check.reason });
      }
      break;
    }
    case "follow_up": {
      const r = p as Extract<NewProposal, { kind: "follow_up" }>["payload"];
      if (LANGUAGE_CODES.some((l) => containsPersonalInfo(r.publicUpdate[l]))) issues.push({ type: "personal_data", note: "The public update contains personal information." });
      if (containsPersonalInfo(r.reminderEs.split(proposal.caseNumber ?? "\u0000").join(" ").replace(/https?:\/\/\S+/g, ""))) {
        issues.push({ type: "personal_data", note: "The reminder contains personal information." });
      }
      break;
    }
    case "office_note": {
      const r = p as Extract<NewProposal, { kind: "office_note" }>["payload"];
      if (LANGUAGE_CODES.some((l) => containsPersonalInfo(r.translations[l]))) issues.push({ type: "personal_data", note: "A translation of the office's note contains personal information." });
      break;
    }
    case "weekly_summary":
    case "office_resolution":
      break;
  }
  return issues;
}

const CritiqueArgs = z.object({
  verdict: z.enum(["ok", "concerns"]),
  issues: z.array(CritiqueIssueSchema).max(6).default([]),
});

export async function runCriticAgent(
  client: Groq | null,
  proposal: Pick<NewProposal, "kind" | "payload" | "caseNumber">,
  c: Case | undefined,
  community: CommunityConfig | undefined,
  now: Date,
): Promise<{ critique: Critique; toolCalls: string[]; aiFailed: boolean }> {
  const rules = ruleChecks(proposal);
  const done = (issues: Issue[], source: "ai" | "rules", toolCalls: string[] = [], aiFailed = false) => ({
    critique: CritiqueSchema.parse({ verdict: issues.length ? "concerns" : "ok", issues: issues.slice(0, 8), source }),
    toolCalls,
    aiFailed,
  });
  if (!client) return done(rules, "rules");

  const result = await runToolAgent({
    client,
    system: `You are the Critic Agent of CommonGround, a community project (student demo). Another
agent produced the ${proposal.kind.replace("_", " ")} below. Before a human moderator sees it, check it for:
- mistakes: facts not in the case, a wrong office or priority, wrong numbers;
- bias: judging the resident or a neighborhood, assumptions about people, unfair priority;
- missing_info: something the moderator needs that is missing;
- personal_data: any name, phone, email, ID or exact address;
- other: promising results, sounding like a government office, claiming something was sent.
Report "ok" with no issues if it is fine. Each issue: one short sentence in English.

${UNTRUSTED_DATA_RULE}

Finish by calling recordCritique.`,
    user: `${c ? caseBlock(c, community, now) : "No single case (community-wide output)."}\n\nOutput to review (${proposal.kind}):\n${JSON.stringify(proposal.payload).slice(0, 4000)}`,
    finalTool: {
      name: "recordCritique",
      description: "Record your review.",
      parameters: {
        type: "object",
        properties: {
          verdict: { type: "string", enum: ["ok", "concerns"] },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: CritiqueIssueSchema.shape.type.options },
                note: { type: "string" },
              },
              required: ["type", "note"],
              additionalProperties: false,
            },
          },
        },
        required: ["verdict"],
        additionalProperties: false,
      },
      schema: CritiqueArgs,
    },
  });
  if (!result.ok) return done(rules, "rules", result.toolCalls, true);
  const aiIssues = result.value.verdict === "ok" ? [] : result.value.issues;
  return done([...rules, ...aiIssues], "ai", result.toolCalls);
}
