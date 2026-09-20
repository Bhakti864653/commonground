"use client";

import { useLanguage } from "@/lib/i18n/context";
import { Wordmark } from "./Logo";
import { CommunitySelector } from "./CommunitySelector";
import { LanguageToggle } from "./LanguageToggle";

export function MobileTopBar() {
  const { language } = useLanguage();

  return (
    <header className="flex items-center justify-between gap-3 border-b border-ink/10 bg-cream px-4 py-3 md:hidden">
      <Wordmark language={language} className="shrink-0 text-base" />
      <div className="flex items-center gap-2">
        <CommunitySelector compact />
        <LanguageToggle className="px-2 py-1.5 text-xs [&>svg]:h-3.5 [&>svg]:w-3.5" />
      </div>
    </header>
  );
}
