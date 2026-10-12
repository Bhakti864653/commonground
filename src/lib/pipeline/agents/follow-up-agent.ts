import type Groq from "groq-sdk";
import { z } from "zod";
import type { Case } from "@/lib/schema/report";
import type { CommunityConfig } from "@/lib/schema/community";
import type { ReferralOffice } from "@/data/referral-offices";
import { LANGUAGE_CODES, type LocalizedText } from "@/lib/i18n/languages";
import { publicCaseUrl } from "@/lib/site-url";
import { runToolAgent } from "../agent-runner";
import { containsPersonalInfo } from "../redact";
import { suggestEscalation, type OverdueCase } from "../schedule";
import { UNTRUSTED_DATA_RULE } from "../untrusted";
import { FollowUpPayloadSchema, MAX_REFERRAL_LENGTH, type FollowUpPayload, type WeeklySummaryPayload } from "../types";
import { caseBlock } from "./context";
import { checkOutgoingMessage, referralFactsBlock, withFacts } from "./referral-agent";

/**
 * Follow-up Agent: for a case that hasn't moved in too long (the rules in schedule.ts decide that,
 * not the AI), it drafts a reminder to the office (dry-run outbox if approved), a short public
 * status update in all seven languages, and whether to escalate the priority. A moderator
 * approves or dismisses each part.
 */

/** Used when the AI is unavailable. True whatever the moderator approves: it claims nothing happened. */
export const TEMPLATE_PUBLIC_UPDATE: LocalizedText = {
  es: "Moderación de CommonGround revisó este caso: sigue abierto y todavía no hay novedades. El envío a oficinas está en pausa en esta demo.",
  en: "CommonGround's moderators checked on this case: it is still open, with no news yet. Sending to offices is paused in this demo.",
  pt: "A moderação do CommonGround verificou este caso: ele continua aberto e ainda não há novidades. O envio a órgãos está pausado nesta demo.",
  fr: "Les modérateurs de CommonGround ont vérifié ce dossier : il est toujours ouvert, sans nouvelles pour l’instant. L’envoi aux services est en pause dans cette démo.",
  zh: "CommonGround 版主检查了此案件：案件仍未解决，暂时还没有新消息。本演示中向部门发送的功能已暂停。",
  hi: "CommonGround के मॉडरेटरों ने इस मामले की जाँच की: यह अभी भी खुला है, अभी तक कोई नई जानकारी नहीं है। इस डेमो में दफ़्तरों को भेजना रुका हुआ है।",
  it: "I moderatori di CommonGround hanno controllato questo caso: è ancora aperto e non ci sono ancora novità. L’invio agli uffici è in pausa in questa demo.",
};

export function templateReminder(office: ReferralOffice, caseNumber: string, days: number): string {
  return `Estimado equipo de ${office.nameEs}:

Les escribimos de nuevo desde CommonGround (proyecto comunitario independiente, demo estudiantil) sobre el caso ${caseNumber}, que sigue abierto y sin novedades desde hace ${days} días. ¿Podrían indicarnos si ya fue revisado o quién lo atiende?

Muchas gracias.
Equipo de moderación de CommonGround`;
}

const LocalizedArgs = z.object(Object.fromEntries(LANGUAGE_CODES.map((l) => [l, z.string().min(1).max(600)])) as Record<(typeof LANGUAGE_CODES)[number], z.ZodString>);

const FollowUpArgs = z.object({
  reminderEs: z.string().min(1).max(MAX_REFERRAL_LENGTH),
  publicUpdate: LocalizedArgs,
  escalate: z.boolean(),
  escalateReason: z.string().max(400).optional(),
});

export type FollowUpOutcome = { payload: FollowUpPayload; toolCalls: string[]; failureNote?: string };

export async function runFollowUpAgent(
  client: Groq | null,
  c: Case,
  community: CommunityConfig | undefined,
  office: ReferralOffice,
  overdue: OverdueCase,
  residents: number,
  now: Date,
): Promise<FollowUpOutcome> {
  const caseUrl = publicCaseUrl(c.publicCaseNumber);
  const daysOpen = Math.max(0, Math.floor((now.getTime() - Date.parse(c.createdAt)) / 86_400_000));
  const facts = referralFactsBlock(c.publicCaseNumber, daysOpen, residents, caseUrl);
  const ruleEscalation = suggestEscalation(overdue.priority, overdue.daysWithoutProgress);
  const base = { daysWithoutProgress: overdue.daysWithoutProgress, thresholdDays: overdue.thresholdDays, priority: overdue.priority };

  if (client) {
    const result = await runToolAgent({
      client,
      system: `You are the Follow-up Agent of CommonGround, an independent community project (a student
demo). This case has had no progress for ${overdue.daysWithoutProgress} days; the limit for
"${overdue.priority}" cases is ${overdue.thresholdDays} days. Draft three things:

1. reminderEs: a short, polite reminder in Spanish to "${office.nameEs}" asking whether the case
   (${c.publicCaseNumber}) was reviewed or who handles it. No link, no day count, no signature:
   code adds those. No names, phones, emails or addresses. Never claim to be a government office.
2. publicUpdate: one or two plain sentences for the public case page, in each of these languages
   (es, en, pt, fr, zh = Simplified Chinese, hi = Hindi in Devanagari, it). Say only that
   CommonGround's moderators checked on the case, that it is still open, and that sending to
   offices is paused in this demo. Never say an office received, answered or acted on anything;
   never mention a reminder; never promise anything.
3. escalate: true only if waiting this long makes the problem more serious (escalateReason: one
   sentence). Rule of thumb: twice the limit or more.

${UNTRUSTED_DATA_RULE}

Finish by calling proposeStatusUpdate.`,
      user: caseBlock(c, community, now),
      finalTool: {
        name: "proposeStatusUpdate",
        description: "Propose the reminder, the public update and whether to escalate. A moderator decides.",
        parameters: {
          type: "object",
          properties: {
            reminderEs: { type: "string" },
            publicUpdate: {
              type: "object",
              properties: Object.fromEntries(LANGUAGE_CODES.map((l) => [l, { type: "string" }])),
              required: [...LANGUAGE_CODES],
              additionalProperties: false,
            },
            escalate: { type: "boolean" },
            escalateReason: { type: "string" },
          },
          required: ["reminderEs", "publicUpdate", "escalate"],
          additionalProperties: false,
        },
        schema: FollowUpArgs,
        validate: (v) => {
          const check = checkOutgoingMessage(withFacts(v.reminderEs, facts), c.publicCaseNumber, caseUrl);
          if (!check.ok) return check.reason;
          const leaking = LANGUAGE_CODES.find((l) => containsPersonalInfo(v.publicUpdate[l]));
          return leaking ? `publicUpdate.${leaking} contains personal information` : null;
        },
      },
    });
    if (result.ok) {
      const v = result.value;
      const escalateTo = v.escalate ? (suggestEscalation(overdue.priority, Number.MAX_SAFE_INTEGER) ?? null) : null;
      return {
        payload: FollowUpPayloadSchema.parse({
          ...base,
          reminderEs: withFacts(v.reminderEs, facts),
          publicUpdate: v.publicUpdate,
          escalateTo,
          ...(escalateTo ? { escalateReason: v.escalateReason ?? `No progress for ${overdue.daysWithoutProgress} days.` } : {}),
          source: "ai",
        }),
        toolCalls: result.toolCalls,
      };
    }
    return fallback(result.message);
  }
  return fallback(null);

  function fallback(reason: string | null): FollowUpOutcome {
    return {
      payload: FollowUpPayloadSchema.parse({
        ...base,
        reminderEs: withFacts(templateReminder(office, c.publicCaseNumber, overdue.daysWithoutProgress), facts),
        publicUpdate: TEMPLATE_PUBLIC_UPDATE,
        escalateTo: ruleEscalation,
        ...(ruleEscalation
          ? { escalateReason: `No progress for ${overdue.daysWithoutProgress} days, at least twice the ${overdue.thresholdDays}-day limit for ${overdue.priority} cases.` }
          : {}),
        source: "rules",
      }),
      toolCalls: [],
      failureNote: reason
        ? `${reason} These are template texts instead — please check them.`
        : "The AI isn't configured on this server. These are template texts — please check them.",
    };
  }
}

// ---- Weekly community summary --------------------------------------------------------------

const HighlightArgs = z.object({ highlight: LocalizedArgs });

/**
 * Summary Agent: the numbers are counted by code (weekly-summary.ts); the AI only adds a one- or
 * two-sentence highlight in the seven languages. Without the AI, the summary has no highlight.
 */
export async function runSummaryHighlight(
  client: Groq | null,
  community: CommunityConfig | undefined,
  stats: Omit<WeeklySummaryPayload, "highlight" | "source">,
): Promise<{ highlight?: LocalizedText; toolCalls: string[]; failureNote?: string }> {
  if (!client) return { toolCalls: [], failureNote: "The AI isn't configured: the summary has the numbers only." };
  const areaName = (id: string) => community?.areas.find((a) => a.id === id)?.label ?? id;
  const result = await runToolAgent({
    client,
    system: `You are the Summary Agent of CommonGround, a community project (a student demo). Write a neutral
one- or two-sentence highlight of this week's numbers for residents, in es, en, pt, fr, zh
(Simplified Chinese), hi (Hindi, Devanagari) and it. Use only the numbers given. Never rank
neighborhoods as better or worse, never blame anyone, never promise anything, and never say an
office acted. Finish by calling recordHighlight.`,
    user: JSON.stringify({ ...stats, hotspots: stats.hotspots.map((h) => ({ area: areaName(h.areaId), count: h.count })) }),
    finalTool: {
      name: "recordHighlight",
      description: "Record the highlight in all seven languages.",
      parameters: {
        type: "object",
        properties: {
          highlight: {
            type: "object",
            properties: Object.fromEntries(LANGUAGE_CODES.map((l) => [l, { type: "string" }])),
            required: [...LANGUAGE_CODES],
            additionalProperties: false,
          },
        },
        required: ["highlight"],
        additionalProperties: false,
      },
      schema: HighlightArgs,
      validate: (v) => (LANGUAGE_CODES.some((l) => containsPersonalInfo(v.highlight[l])) ? "the highlight contains personal information" : null),
    },
  });
  if (!result.ok) return { toolCalls: result.toolCalls, failureNote: `${result.message} The summary has the numbers only.` };
  return { highlight: result.value.highlight, toolCalls: result.toolCalls };
}
