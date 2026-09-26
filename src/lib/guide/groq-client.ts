import Groq from "groq-sdk";

/**
 * Same model already proven working on Synaptiq — a prior model
 * (`llama-3.3-70b-versatile`) was fully removed from Groq's lineup mid-project there, so this
 * one is a known-current choice, not an assumption from training data.
 */
export const GUIDE_MODEL = "openai/gpt-oss-120b";

let client: Groq | null = null;

/** Returns null when no key is configured — every caller must handle that as "unavailable". */
export function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  if (!client) {
    // The SDK's default timeout is 10 minutes — far longer than a serverless request lives. Fail
    // fast instead, so the caller can show "unavailable" rather than hang.
    client = new Groq({ apiKey, timeout: 30_000, maxRetries: 2 });
  }
  return client;
}
