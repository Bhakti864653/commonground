import { vi } from "vitest";
import type Groq from "groq-sdk";

type Request = {
  messages: Array<{ role: string; content?: string | null }>;
  tools?: Array<{ function: { name: string } }>;
  tool_choice?: unknown;
};

/** What a handler returns: the final tool's arguments, a lookup call to make first, or an error. */
export type FakeReply = Record<string, unknown> | { __call: string; args?: Record<string, unknown> } | Error | string;

/**
 * A stand-in for the Groq client that never touches the network. Each request is answered by the
 * handler for its final ("propose") tool — the last tool in the request — so tests script every
 * agent by name. `requests` keeps every request for assertions about prompts.
 */
export function fakeGroq(handlers: Record<string, (request: Request, nth: number) => FakeReply>) {
  const requests: Request[] = [];
  const counts = new Map<string, number>();
  const create = vi.fn(async (request: Request) => {
    requests.push(request);
    const finalName = request.tools?.at(-1)?.function.name ?? "";
    const handler = handlers[finalName];
    if (!handler) throw new Error(`fakeGroq: no handler for ${finalName}`);
    const nth = counts.get(finalName) ?? 0;
    counts.set(finalName, nth + 1);
    const reply = handler(request, nth);
    if (reply instanceof Error) throw reply;
    const call =
      typeof reply === "object" && reply !== null && "__call" in reply
        ? { name: String(reply.__call), args: JSON.stringify(reply.args ?? {}) }
        : { name: finalName, args: typeof reply === "string" ? reply : JSON.stringify(reply) };
    return {
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [{ id: `call_${requests.length}`, type: "function", function: { name: call.name, arguments: call.args } }],
          },
        },
      ],
    };
  });
  return { client: { chat: { completions: { create } } } as unknown as Groq, requests, create };
}

export const ALL_LANGS = (text: string) => ({ es: text, en: text, pt: text, fr: text, zh: text, hi: text, it: text });

/** Valid default answers for every agent. */
export const DEFAULT_HANDLERS = {
  proposeRouting: (_r: Request, nth: number): FakeReply =>
    nth === 0
      ? { __call: "searchSimilarCases" }
      : { officeId: "drainage", reason: "A blocked drain.", priority: "medium", priorityReason: "Recurring.", confidence: 0.9, alternativeOfficeIds: [], possibleDuplicates: [] },
  recordCritique: (): FakeReply => ({ verdict: "ok", issues: [] }),
  draftReferral: (): FakeReply => ({
    messageEs: "Estimado equipo: les escribimos desde CommonGround, un proyecto comunitario independiente, sobre un drenaje tapado. ¿Podrían revisarlo?",
    translation: "Dear team: we write from CommonGround about a blocked drain. Could you look into it?",
  }),
  proposeStatusUpdate: (): FakeReply => ({
    reminderEs: "Estimado equipo: les escribimos de nuevo sobre este caso, que sigue abierto. ¿Ya fue revisado?",
    publicUpdate: ALL_LANGS("CommonGround's moderators checked on this case: it is still open."),
    escalate: true,
    escalateReason: "Waiting more than twice the limit.",
  }),
  recordHighlight: (): FakeReply => ({ highlight: ALL_LANGS("Two new reports this week.") }),
};
