"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import type { Language } from "@/lib/i18n/dictionary";
import { EXPERIENCE } from "@/lib/i18n/experience";
import { dateLocale } from "@/lib/i18n/languages";
import { transcribeGuideAudioAction } from "@/lib/guide/actions";
import { startLivePreview } from "./live-speech";

const MAX_RECORDING_MS = 60_000;
/** Speech needs far less than the browser default; keeps a full minute well under the 2 MB cap. */
const AUDIO_BITS_PER_SECOND = 32_000;

type Status = "idle" | "recording" | "transcribing";
type VoiceError = keyof typeof EXPERIENCE.guide.voice.errors;

function pickMimeType(): string | undefined {
  // Chrome/Firefox/Edge record Opus in webm; Safari only records mp4. Groq accepts both.
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * Records a short clip and hands back what was said. The text goes into the message box for the
 * resident to read and edit — speaking never sends a message on its own. While recording, an
 * on-device preview (see live-speech.ts) shows the words as they're spoken where the browser
 * supports it; Groq's transcript replaces it when the resident presses Stop.
 */
export function VoiceInputButton({
  language,
  disabled,
  onTranscript,
}: {
  language: Language;
  disabled: boolean;
  onTranscript: (text: string) => void;
}) {
  const v = EXPERIENCE.guide.voice;
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<VoiceError | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [preview, setPreview] = useState("");
  const [installing, setInstalling] = useState(false);
  const [usedPreview, setUsedPreview] = useState(false);
  // The transcribe step runs from the recorder's onstop callback, so it reads the latest preview
  // through a ref rather than a stale closure.
  const previewRef = useRef("");
  const stopPreviewRef = useRef<(() => void) | null>(null);

  function updatePreview(text: string) {
    previewRef.current = text;
    setPreview(text);
  }

  function stopPreview() {
    stopPreviewRef.current?.();
    stopPreviewRef.current = null;
  }

  // Leaving the page mid-recording must release the microphone.
  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stopPreviewRef.current?.();
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") recorder.stop();
        recorder.stream.getTracks().forEach((track) => track.stop());
      }
    },
    [],
  );

  async function start() {
    setError(null);
    setUsedPreview(false);
    updatePreview("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("unsupported");
      return;
    }
    // Started before the permission prompt, while the click still counts as a user gesture —
    // a first-time language-pack install needs one.
    const previewStarting = startLivePreview(dateLocale(language), updatePreview);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      void previewStarting.then((p) => p.kind === "running" && p.stop());
      setError("denied");
      return;
    }

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: AUDIO_BITS_PER_SECOND });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stopPreview();
      stream.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      void transcribe(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
    };
    recorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
    timeoutRef.current = setTimeout(stop, MAX_RECORDING_MS);

    const livePreview = await previewStarting;
    setInstalling(livePreview.kind === "installing");
    if (livePreview.kind !== "running") return;
    // The resident may already have pressed Stop while the preview was starting.
    if (recorderRef.current === recorder) stopPreviewRef.current = livePreview.stop;
    else livePreview.stop();
  }

  function stop() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  async function transcribe(audio: Blob) {
    setStatus("transcribing");
    try {
      const formData = new FormData();
      formData.append("audio", audio);
      formData.append("language", language);
      const result = await transcribeGuideAudioAction(formData);
      if (result.ok) onTranscript(result.text);
      else if (previewRef.current) fallBackToPreview();
      else setError(result.reason === "empty" ? "empty" : "failed");
    } catch {
      if (previewRef.current) fallBackToPreview();
      else setError("failed");
    } finally {
      updatePreview("");
      setInstalling(false);
      setStatus("idle");
    }
  }

  /** Groq failed but the on-device preview heard something: better than losing what was said. */
  function fallBackToPreview() {
    onTranscript(previewRef.current);
    setUsedPreview(true);
  }

  const recording = status === "recording";
  const transcribing = status === "transcribing";
  const message = error
    ? v.errors[error][language]
    : usedPreview
      ? v.usedPreview[language]
      : recording
        ? `${v.recording[language]}${installing ? ` ${v.installing[language]}` : ""}`
        : transcribing
          ? v.transcribing[language]
          : null;

  return (
    <>
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={transcribing || (disabled && !recording)}
        aria-pressed={recording}
        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-3 text-sm font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-50 ${
          recording ? "border-coral bg-coral/10 text-coral" : "border-line bg-surface text-ink hover:bg-mint"
        }`}
      >
        {transcribing ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
        ) : recording ? (
          <Square aria-hidden="true" className="h-4 w-4 fill-current" />
        ) : (
          <Mic aria-hidden="true" className="h-4 w-4" />
        )}
        {recording ? v.stop[language] : v.start[language]}
      </button>
      {/* The form row wraps, so this status line sits on its own line under the input. */}
      {(recording || transcribing) && preview && (
        <div className="order-last basis-full rounded-[20px] border border-dashed border-line bg-paper px-[17px] py-3">
          <p className="text-xs font-extrabold text-slate">{v.livePreview[language]}</p>
          <p className="italic text-slate">{preview}</p>
        </div>
      )}
      <VoiceStatus message={message} isError={error !== null} />
    </>
  );
}

function VoiceStatus({ message, isError }: { message: string | null; isError: boolean }) {
  return (
    <p role="status" className={`order-last basis-full text-sm ${isError ? "text-coral" : "text-slate"} ${message ? "" : "sr-only"}`}>
      {message}
    </p>
  );
}
