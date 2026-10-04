import Groq, { toFile } from "groq-sdk";
import { getGroqClient } from "./groq-client";
import type { Language } from "@/lib/i18n/dictionary";

/**
 * Groq's speech-to-text model (console.groq.com/docs/speech-to-text, checked 2026-10-04). The
 * turbo variant is the cheaper/faster one and transcribes every language the interface speaks.
 */
export const TRANSCRIBE_MODEL = "whisper-large-v3-turbo";

/** The chat recorder stops at 60 s of low-bitrate Opus (~250 KB); 2 MB leaves room for Safari's mp4. */
export const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

const ALLOWED_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav"];

export type TranscriptionResult =
  | { ok: true; text: string }
  | { ok: false; reason: "invalid" | "too_large" | "unavailable" | "empty" };

/** "audio/webm;codecs=opus" → "audio/webm". */
function baseType(type: string): string {
  return type.split(";")[0].trim().toLowerCase();
}

/**
 * Turns a recorded clip into text for the resident to review — it never sends anything to the
 * Guide by itself. The language hint is the interface language, which is what residents speak
 * in almost every case; Whisper still copes if they switch.
 */
export async function transcribeAudio(audio: unknown, language: Language): Promise<TranscriptionResult> {
  if (!(audio instanceof Blob) || audio.size === 0) return { ok: false, reason: "invalid" };
  if (audio.size > MAX_AUDIO_BYTES) return { ok: false, reason: "too_large" };
  const type = baseType(audio.type);
  if (!ALLOWED_TYPES.includes(type)) return { ok: false, reason: "invalid" };

  const client = getGroqClient();
  if (!client) return { ok: false, reason: "unavailable" };

  try {
    const extension = type.split("/")[1].replace("x-", "").replace("mpeg", "mp3");
    // Pass raw bytes, not the Blob: a File arriving through FormData is named "blob", and toFile
    // keeps an existing File's name — Groq picks the format from the extension and rejects it.
    const file = await toFile(await audio.arrayBuffer(), `guide-message.${extension}`, { type });
    const result = await client.audio.transcriptions.create({
      model: TRANSCRIBE_MODEL,
      file,
      language,
      temperature: 0,
    });
    const text = result.text.trim().slice(0, 2000);
    return text ? { ok: true, text } : { ok: false, reason: "empty" };
  } catch (error) {
    // Same contract as the chat: a Groq failure (rate limit, timeout, bad audio) is "unavailable",
    // anything else is a real bug and should surface.
    if (error instanceof Groq.APIError) {
      // Server log only — the resident just sees "try again". Never logs the audio or the key.
      console.warn(`[guide-voice] Groq transcription failed: ${error.status ?? "no status"} ${error.message}`);
      return { ok: false, reason: "unavailable" };
    }
    throw error;
  }
}
