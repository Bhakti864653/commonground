import type Groq from "groq-sdk";
import { z } from "zod";
import type { Case } from "@/lib/schema/report";
import type { CommunityConfig } from "@/lib/schema/community";
import type { ReferralOffice } from "@/data/referral-offices";
import { modelLanguageName, type Language } from "@/lib/i18n/languages";
import { publicCaseUrl } from "@/lib/site-url";
import { runToolAgent } from "../agent-runner";
import { containsPersonalInfo } from "../redact";
import { UNTRUSTED_DATA_RULE } from "../untrusted";
import { MAX_REFERRAL_LENGTH, ReferralPayloadSchema, type ReferralPayload } from "../types";
import { caseBlock, caseFacts, caseReadTools, residentCount } from "./context";

/**
 * Referral Agent: a formal, polite message to the responsible office, in Spanish (plus the
 * moderator's language when that isn't Spanish). The facts block — case number, days open, how
 * many residents reported it, the public link — is written by code, not the model, so it's
 * always exact. The message is checked (case number, link, no personal data) before a moderator
 * sees it, and again after they edit it. Approving it only puts it in the dry-run outbox.
 */

const SIGNATURE = "Equipo de moderación de CommonGround";

export function referralFactsBlock(caseNumber: string, daysOpen: number, residents: number, caseUrl: string): string {
  return [
    `Caso: ${caseNumber}`,
    `Abierto desde hace: ${daysOpen} ${daysOpen === 1 ? "día" : "días"}`,
    `Residentes que lo reportaron: ${residents}`,
    `Caso público: ${caseUrl}`,
  ].join("\n");
}

/** Puts the facts block just above the signature (adding the signature if missing). */
export function withFacts(message: string, facts: string): string {
  const body = message.trim();
  const at = body.lastIndexOf(SIGNATURE);
  let main = (at === -1 ? body : body.slice(0, at)).trimEnd();
  // Drop the model's own closing line(s); code adds one.
  const closing = /\n\s*(?:muchas gracias|gracias|saludos cordiales|saludos|atentamente|cordialmente)[^\n]{0,40}$/i;
  while (closing.test(main)) main = main.replace(closing, "").trimEnd();
  return `${main}\n\n${facts}\n\nMuchas gracias.\n${SIGNATURE}`;
}

export type MessageCheck = { ok: true } | { ok: false; reason: string };

/** The hard rules for any referral or reminder text, whoever wrote or edited it. */
export function checkOutgoingMessage(message: string, caseNumber: string, caseUrl: string): MessageCheck {
  if (!message.trim()) return { ok: false, reason: "The message is empty." };
  if (message.length > MAX_REFERRAL_LENGTH) return { ok: false, reason: `The message is longer than ${MAX_REFERRAL_LENGTH} characters.` };
  if (!message.includes(caseNumber)) return { ok: false, reason: "The message must include the case number." };
  if (!message.includes(caseUrl)) return { ok: false, reason: "The message must include the public link to the case." };
  const rest = message.split(caseUrl).join(" ");
  if (/https?:\/\/|www\./i.test(rest)) return { ok: false, reason: "The only link allowed is the case's public page." };
  if (containsPersonalInfo(rest)) return { ok: false, reason: "The message contains personal information (a phone, email, ID, house number or name)." };
  return { ok: true };
}

export function templateReferral(office: ReferralOffice, facts: ReturnType<typeof caseFacts>): string {
  const kind = facts.type === "proposal" ? "propuesta" : "reporte";
  return `Estimado equipo de ${office.nameEs}:

Les escribimos desde CommonGround, un proyecto comunitario independiente (demo estudiantil, no es una oficina de gobierno). Un residente envió un ${kind} sobre "${facts.categoryEs}" en ${facts.areaEs}: ${facts.description.slice(0, 500)}

¿Podrían indicarnos si su oficina puede revisarlo, o quién lo atiende?

Muchas gracias.
${SIGNATURE}`;
}

const DraftArgs = z.object({
  messageEs: z.string().min(1).max(MAX_REFERRAL_LENGTH),
  translation: z.string().max(MAX_REFERRAL_LENGTH).optional(),
});

export type ReferralOutcome = { payload: ReferralPayload; toolCalls: string[]; failureNote?: string };

export async function runReferralAgent(
  client: Groq | null,
  c: Case,
  community: CommunityConfig | undefined,
  office: ReferralOffice,
  moderatorLanguage: Language,
  now: Date,
): Promise<ReferralOutcome> {
  const facts = caseFacts(c, community, now);
  const caseUrl = publicCaseUrl(c.publicCaseNumber);
  const residents = await residentCount(c);
  const factsBlock = referralFactsBlock(c.publicCaseNumber, facts.daysOpen, residents, caseUrl);
  const wantsTranslation = moderatorLanguage !== "es";
  const factsPayload = { daysOpen: facts.daysOpen, residentCount: residents, caseUrl };

  if (client) {
    const result = await runToolAgent({
      client,
      maxSteps: 2,
      system: `You are the Referral Agent of CommonGround, an independent community technology project (a
student demo; it does not represent any government). Write a short, formal and polite message in
Spanish to the office "${office.nameEs}" about one resident report.

The message must: greet the office; say it comes from CommonGround, an independent community
project; mention the case number ${c.publicCaseNumber}, the category and the approximate zone;
summarize the description faithfully in Spanish without adding facts; politely ask whether the
office can look into it or say who handles it. Do NOT include the link, the number of days, the
number of residents or a signature — code adds those exactly. Plain text, under 900 characters.

It must never include names, phone numbers, emails, exact addresses or links; never promise
anything; never claim to be a government office; never call it an emergency unless the report says so.
${wantsTranslation ? `\nAlso give "translation": the same message in ${modelLanguageName(moderatorLanguage)}, for the moderator to read.` : ""}

${UNTRUSTED_DATA_RULE}

Finish by calling draftReferral.`,
      user: caseBlock(c, community, now),
      readTools: caseReadTools(c, now).filter((t) => t.name === "getCase"),
      finalTool: {
        name: "draftReferral",
        description: "Record the drafted referral message.",
        parameters: {
          type: "object",
          properties: {
            messageEs: { type: "string", description: "The message in Spanish, plain text." },
            ...(wantsTranslation ? { translation: { type: "string", description: `The same message in ${modelLanguageName(moderatorLanguage)}.` } } : {}),
          },
          required: wantsTranslation ? ["messageEs", "translation"] : ["messageEs"],
          additionalProperties: false,
        },
        schema: DraftArgs,
        validate: (v) => {
          const full = withFacts(v.messageEs, factsBlock);
          const check = checkOutgoingMessage(full, c.publicCaseNumber, caseUrl);
          return check.ok ? null : check.reason;
        },
      },
    });
    if (result.ok) {
      const messageEs = withFacts(result.value.messageEs, factsBlock);
      return {
        payload: ReferralPayloadSchema.parse({
          officeId: office.id,
          messageEs,
          ...(wantsTranslation && result.value.translation
            ? { translation: { language: moderatorLanguage, text: `${result.value.translation.trim()}\n\n${factsBlock}` } }
            : {}),
          facts: factsPayload,
          source: "ai",
        }),
        toolCalls: result.toolCalls,
      };
    }
    return fallback(result.message);
  }
  return fallback(null);

  function fallback(reason: string | null): ReferralOutcome {
    return {
      payload: ReferralPayloadSchema.parse({
        officeId: office.id,
        messageEs: withFacts(templateReferral(office, facts), factsBlock),
        facts: factsPayload,
        source: "rules",
      }),
      toolCalls: [],
      failureNote: reason
        ? `${reason} This is a template message instead — please read and edit it.`
        : "The AI isn't configured on this server. This is a template message — please read and edit it.",
    };
  }
}
