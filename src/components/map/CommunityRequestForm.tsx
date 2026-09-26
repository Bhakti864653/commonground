"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { INFO } from "@/lib/i18n/community-info";
import { fill } from "@/lib/i18n/experience";
import { requestCommunity } from "@/lib/store/actions";

/**
 * Turns the "not set up here yet" dead end into a way to register interest. Anonymous: only the
 * place name, an optional note, and the interface language are sent — never contact details.
 */
export function CommunityRequestForm({ placeName }: { placeName: string }) {
  const { language } = useLanguage();
  const t = INFO.request;
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (status === "sent") {
    return (
      <p role="status" className="mt-6 flex max-w-xl items-start gap-2 rounded-2xl bg-surface p-4 text-sm text-ink">
        <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-teal" strokeWidth={3} />
        {fill(t.thanks[language], { place: placeName })}
      </p>
    );
  }

  return (
    <form
      className="mt-6 flex max-w-xl flex-col gap-3 rounded-2xl bg-surface p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("sending");
        try {
          const ok = await requestCommunity({ placeName, note, language });
          setStatus(ok ? "sent" : "error");
        } catch {
          setStatus("error");
        }
      }}
    >
      <h3 className="text-2xl text-ink">{fill(t.heading[language], { place: placeName })}</h3>
      <p className="text-sm text-slate">{t.body[language]}</p>
      <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
        {t.noteLabel[language]}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          className="rounded-xl border border-line bg-paper px-3 py-2 text-sm font-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
        />
      </label>
      <p className="text-xs text-slate">{t.privacy[language]}</p>
      {status === "error" && (
        <p role="alert" className="text-sm font-bold text-coral">
          {t.error[language]}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex w-max items-center gap-2 rounded-full bg-ink px-5 py-3 text-[0.85rem] font-extrabold text-paper hover:bg-ink/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-60"
      >
        <Send aria-hidden="true" className="h-4 w-4" />
        {status === "sending" ? t.sending[language] : fill(t.submit[language], { place: placeName })}
      </button>
    </form>
  );
}
