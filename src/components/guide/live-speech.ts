/**
 * Live "words while you talk" preview for the Guide's voice input, using the browser's own
 * speech recognition — **on-device only** (`processLocally`), so this preview never sends audio
 * to Google/Apple/Microsoft. Groq Whisper still produces the text that goes into the message box;
 * this is only a rough preview of it. Browsers without on-device support simply get no preview.
 */

type Availability = "available" | "downloadable" | "downloading" | "unavailable";

/** The slice of the (still experimental, untyped in lib.dom) Web Speech API this file uses. */
interface LocalRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface RecognitionConstructor {
  new (): LocalRecognition;
  available?(options: { langs: string[]; processLocally: boolean }): Promise<Availability>;
  install?(options: { langs: string[]; processLocally: boolean }): Promise<boolean>;
}

function recognitionConstructor(): RecognitionConstructor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor };
  // Only the standard constructor: the prefixed webkitSpeechRecognition has no on-device mode.
  return w.SpeechRecognition?.available ? w.SpeechRecognition : null;
}

export type LivePreview =
  | { kind: "running"; stop: () => void }
  /** The language pack is downloading now; the preview works from the next recording. */
  | { kind: "installing" }
  | { kind: "none" };

/**
 * Starts an on-device preview in `locale` if the browser can do it right now. Must be called
 * from the click handler: `install()` needs the user's gesture.
 */
export async function startLivePreview(locale: string, onText: (text: string) => void): Promise<LivePreview> {
  const Recognition = recognitionConstructor();
  if (!Recognition?.available) return { kind: "none" };

  let availability: Availability;
  try {
    availability = await Recognition.available({ langs: [locale], processLocally: true });
  } catch {
    return { kind: "none" };
  }
  if (availability === "unavailable") return { kind: "none" };
  if (availability !== "available") {
    void Recognition.install?.({ langs: [locale], processLocally: true }).catch(() => false);
    return { kind: "installing" };
  }

  const recognition = new Recognition();
  recognition.lang = locale;
  recognition.processLocally = true;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    // Results accumulate across the session; rebuild the full text each time.
    const parts = Array.from(event.results, (result) => result[0]?.transcript ?? "");
    onText(parts.join(" ").replace(/\s+/g, " ").trim());
  };
  // A preview failure must never interrupt the real recording — it just stops updating.
  recognition.onerror = () => {};
  try {
    recognition.start();
  } catch {
    return { kind: "none" };
  }
  return {
    kind: "running",
    stop: () => {
      recognition.onresult = null;
      recognition.abort();
    },
  };
}
