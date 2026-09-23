"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { LogoMark } from "./Logo";
import { CommunitySelector } from "./CommunitySelector";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { UI_STRINGS } from "@/lib/i18n/dictionary";

const compactToggle = "px-2 py-1.5 text-xs [&>svg]:h-3.5 [&>svg]:w-3.5";

/** Below xl: the mark alone (it reads without the wordmark), community, and the two toggles. */
export function MobileTopBar() {
  const { language } = useLanguage();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-ink/10 bg-cream/90 px-4 py-2.5 backdrop-blur xl:hidden">
      <Link
        href="/"
        aria-label={UI_STRINGS.wordmark[language]}
        className="shrink-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
      >
        <LogoMark className="h-8 w-8" />
      </Link>
      <div className="min-w-0 flex-1">
        <CommunitySelector compact />
      </div>
      <LanguageToggle className={compactToggle} />
      <ThemeToggle className={compactToggle} />
    </header>
  );
}
