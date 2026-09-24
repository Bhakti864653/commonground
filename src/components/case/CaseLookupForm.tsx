"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";

export function CaseLookupForm() {
  const { language } = useLanguage();
  const router = useRouter();
  const [value, setValue] = useState("");
  const t = UI_STRINGS.caseLookup;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        router.push(`/cases/${encodeURIComponent(trimmed)}`);
      }}
      className="flex gap-2"
    >
      <label className="sr-only" htmlFor="case-lookup">
        {t.heading[language]}
      </label>
      <input
        id="case-lookup"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t.placeholder[language]}
        className="min-h-[42px] w-full rounded-full border border-line bg-surface px-4 text-[0.85rem] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-ink px-4 text-[0.8rem] font-extrabold text-paper hover:bg-ink/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      >
        {t.submit[language]}
      </button>
    </form>
  );
}
