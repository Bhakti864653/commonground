import { describe, expect, it, vi } from "vitest";
import Groq from "groq-sdk";
import { z } from "zod";
import { runToolAgent, type FinalTool } from "../agent-runner";

type Call = { name: string; args: unknown };

/** A fake Groq client that answers each request with the next scripted tool call(s). */
function fakeClient(script: Array<Call[] | Error>) {
  const create = vi.fn(async () => {
    const next = script.shift();
    if (!next) throw new Error("script exhausted");
    if (next instanceof Error) throw next;
    return {
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: next.map((c, i) => ({
              id: `call_${i}`,
              type: "function",
              function: { name: c.name, arguments: typeof c.args === "string" ? c.args : JSON.stringify(c.args) },
            })),
          },
        },
      ],
    };
  });
  return { client: { chat: { completions: { create } } } as unknown as Groq, create };
}

const final: FinalTool<{ officeId: string }> = {
  name: "propose",
  description: "",
  parameters: {},
  schema: z.object({ officeId: z.string() }),
  validate: (v) => (["a", "b"].includes(v.officeId) ? null : `unknown office ${v.officeId}`),
};

describe("runToolAgent", () => {
  it("runs read tools, then returns the validated final call", async () => {
    const lookup = vi.fn(async () => ({ cases: [] }));
    const { client } = fakeClient([[{ name: "searchSimilarCases", args: {} }], [{ name: "propose", args: { officeId: "a" } }]]);
    const result = await runToolAgent({
      client,
      system: "s",
      user: "u",
      readTools: [{ name: "searchSimilarCases", description: "", parameters: {}, run: lookup }],
      finalTool: final,
    });
    expect(result).toEqual({ ok: true, value: { officeId: "a" }, toolCalls: ["searchSimilarCases", "propose"] });
    expect(lookup).toHaveBeenCalledOnce();
  });

  it("retries once on invalid output, then succeeds", async () => {
    const { client, create } = fakeClient([[{ name: "propose", args: { officeId: "evil" } }], [{ name: "propose", args: { officeId: "b" } }]]);
    const result = await runToolAgent({ client, system: "s", user: "u", finalTool: final });
    expect(result.ok && result.value.officeId).toBe("b");
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("fails with invalid_output after a second bad answer", async () => {
    const { client, create } = fakeClient([[{ name: "propose", args: "{not json" }], [{ name: "propose", args: { wrong: 1 } }]]);
    const result = await runToolAgent({ client, system: "s", user: "u", finalTool: final });
    expect(result).toMatchObject({ ok: false, reason: "invalid_output" });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("reports a rate limit instead of throwing", async () => {
    const rateLimit = new Groq.RateLimitError(429, { error: { message: "slow down" } }, "slow down", new Headers());
    const { client } = fakeClient([rateLimit]);
    const result = await runToolAgent({ client, system: "s", user: "u", finalTool: final });
    expect(result).toMatchObject({ ok: false, reason: "rate_limited" });
  });

  it("reports any other failure as unavailable", async () => {
    const { client } = fakeClient([new Error("network down")]);
    const result = await runToolAgent({ client, system: "s", user: "u", finalTool: final });
    expect(result).toMatchObject({ ok: false, reason: "unavailable" });
  });
});
