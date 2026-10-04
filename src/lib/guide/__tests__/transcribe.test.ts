import { beforeEach, describe, expect, it, vi } from "vitest";
import Groq from "groq-sdk";

const create = vi.fn();
let hasKey = true;
vi.mock("@/lib/guide/groq-client", () => ({
  getGroqClient: () => (hasKey ? { audio: { transcriptions: { create } } } : null),
}));

import { MAX_AUDIO_BYTES, TRANSCRIBE_MODEL, transcribeAudio } from "@/lib/guide/transcribe";

const clip = (type = "audio/webm;codecs=opus", size = 1000) => new Blob([new Uint8Array(size)], { type });

describe("transcribeAudio (public voice input)", () => {
  beforeEach(() => {
    create.mockReset();
    hasKey = true;
  });

  it("sends a valid clip to Whisper with the interface language and returns trimmed text", async () => {
    create.mockResolvedValue({ text: "  Hay un hueco en la calle.  " });
    const result = await transcribeAudio(clip(), "es");
    expect(result).toEqual({ ok: true, text: "Hay un hueco en la calle." });
    const params = create.mock.calls[0][0];
    expect(params.model).toBe(TRANSCRIBE_MODEL);
    expect(params.language).toBe("es");
    expect(params.file.name).toBe("guide-message.webm");
  });

  it("renames a FormData upload (always called 'blob') so Groq can tell its format", async () => {
    create.mockResolvedValue({ text: "hola" });
    const upload = new File([new Uint8Array(1000)], "blob", { type: "audio/webm;codecs=opus" });
    expect(await transcribeAudio(upload, "es")).toEqual({ ok: true, text: "hola" });
    expect(create.mock.calls[0][0].file.name).toBe("guide-message.webm");
  });

  it("accepts Safari's mp4 recordings", async () => {
    create.mockResolvedValue({ text: "hello" });
    expect(await transcribeAudio(clip("audio/mp4"), "en")).toEqual({ ok: true, text: "hello" });
    expect(create.mock.calls[0][0].file.name).toBe("guide-message.mp4");
  });

  it("rejects non-audio, empty, and oversized input without calling the API", async () => {
    expect(await transcribeAudio("not a file", "es")).toEqual({ ok: false, reason: "invalid" });
    expect(await transcribeAudio(clip("audio/webm", 0), "es")).toEqual({ ok: false, reason: "invalid" });
    expect(await transcribeAudio(clip("text/html"), "es")).toEqual({ ok: false, reason: "invalid" });
    expect(await transcribeAudio(clip("audio/webm", MAX_AUDIO_BYTES + 1), "es")).toEqual({ ok: false, reason: "too_large" });
    expect(create).not.toHaveBeenCalled();
  });

  it("reports unavailable with no key or on a Groq error", async () => {
    hasKey = false;
    expect(await transcribeAudio(clip(), "es")).toEqual({ ok: false, reason: "unavailable" });
    hasKey = true;
    create.mockRejectedValue(new Groq.APIError(429, undefined, "rate limited", undefined));
    expect(await transcribeAudio(clip(), "es")).toEqual({ ok: false, reason: "unavailable" });
  });

  it("reports silence as empty and caps very long text", async () => {
    create.mockResolvedValue({ text: "   " });
    expect(await transcribeAudio(clip(), "es")).toEqual({ ok: false, reason: "empty" });
    create.mockResolvedValue({ text: "a".repeat(5000) });
    const result = await transcribeAudio(clip(), "es");
    expect(result.ok && result.text.length).toBe(2000);
  });
});
