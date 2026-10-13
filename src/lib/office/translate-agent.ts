import type Groq from "groq-sdk";
import { z } from "zod";
import { LANGUAGE_CODES, type LocalizedText } from "@/lib/i18n/languages";
import { runToolAgent } from "@/lib/pipeline/agent-runner";
import { containsPersonalInfo } from "@/lib/pipeline/redact";
import { UNTRUSTED_DATA_RULE, untrustedBlock } from "@/lib/pipeline/untrusted";

/**
 * Translates an office's public note into the seven interface languages, for a moderator to check
 * before it is published. Faithful translation only. Without the AI, every language shows the
 * original text and the moderator is told.
 */
const Args = z.object(Object.fromEntries(LANGUAGE_CODES.map((l) => [l, z.string().min(1).max(1000)])) as Record<(typeof LANGUAGE_CODES)[number], z.ZodString>);

export async function translateOfficeNote(
  client: Groq | null,
  text: string,
): Promise<{ translations: LocalizedText; source: "ai" | "rules"; failureNote?: string }> {
  const original = Object.fromEntries(LANGUAGE_CODES.map((l) => [l, text])) as LocalizedText;
  if (!client) return { translations: original, source: "rules", failureNote: "The AI isn't configured: every language shows the original text." };
  const result = await runToolAgent({
    client,
    system: `You translate a short public note written by a local office about a community case into
es, en, pt, fr, zh (Simplified Chinese), hi (Hindi, Devanagari) and it. Translate faithfully: add
nothing, remove nothing, keep dates and numbers exactly. If the note is already in one of these
languages, keep that version as written.

${UNTRUSTED_DATA_RULE.replace("member of the\npublic", "office").replace("member of the public", "office")}

Finish by calling recordTranslation.`,
    user: untrustedBlock("office note", text),
    finalTool: {
      name: "recordTranslation",
      description: "Record the note in all seven languages.",
      parameters: {
        type: "object",
        properties: Object.fromEntries(LANGUAGE_CODES.map((l) => [l, { type: "string" }])),
        required: [...LANGUAGE_CODES],
        additionalProperties: false,
      },
      schema: Args,
      validate: (v) => (LANGUAGE_CODES.some((l) => containsPersonalInfo(v[l])) ? "a translation contains personal information" : null),
    },
  });
  if (!result.ok) return { translations: original, source: "rules", failureNote: `${result.message} Every language shows the original text.` };
  return { translations: result.value, source: "ai" };
}
