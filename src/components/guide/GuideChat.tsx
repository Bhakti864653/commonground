"use client";

import { useState } from "react";
import { AlertTriangle, Send } from "lucide-react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { askGuideAction } from "@/lib/guide/actions";

type Turn = { role: "user" | "assistant"; content: string; emergency?: boolean };

export function GuideChat() {
  const { community } = useCommunity();
  const { language } = useLanguage();
  const t = UI_STRINGS.guide;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function send() {
    const message = input.trim();
    if (!message || pending) return;
    setInput("");
    const history = turns.map(({ role, content }) => ({ role, content }));
    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setPending(true);
    const result = await askGuideAction(community.id, message, language, history);
    setTurns((prev) => [
      ...prev,
      { role: "assistant", content: result.answer, emergency: result.emergency },
    ]);
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-[16rem] flex-col gap-3 rounded-lg border border-ink/10 p-4">
        {turns.length === 0 ? (
          <p className="text-sm text-slate">{t.emptyState[language]}</p>
        ) : (
          turns.map((turn, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                turn.role === "user"
                  ? "self-end bg-teal text-cream"
                  : turn.emergency
                    ? "self-start border border-coral/40 bg-coral/10 text-ink"
                    : "self-start bg-mint/40 text-ink"
              }`}
            >
              {turn.emergency && (
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-coral">
                  <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
                  {language === "es" ? "No es un servicio de emergencia" : "Not an emergency service"}
                </p>
              )}
              <p className="whitespace-pre-wrap">{turn.content}</p>
            </div>
          ))
        )}
        {pending && <p className="self-start text-sm text-slate">{t.thinking[language]}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label={t.heading[language]}
          placeholder={t.placeholder[language]}
          className="flex-1 rounded-md border border-ink/15 bg-cream px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-teal px-3 py-2 text-sm font-medium text-cream disabled:opacity-50"
        >
          <Send aria-hidden="true" className="h-4 w-4" />
          {t.send[language]}
        </button>
      </form>
    </div>
  );
}
