import { z } from "zod";

const TurnSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string() });

/**
 * The chat history arrives through a public Server Function (Next.js docs: treat it as a public
 * endpoint), so it is validated, not trusted: only user/assistant turns survive — a client can't
 * slip in a "system" instruction — only the last 6 are kept (all the Guide uses), and each is
 * length-capped.
 */
export function sanitizeHistory(history: unknown): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(history)) return [];
  return history.slice(-6).flatMap((turn) => {
    const parsed = TurnSchema.safeParse(turn);
    return parsed.success ? [{ role: parsed.data.role, content: parsed.data.content.slice(0, 4000) }] : [];
  });
}
