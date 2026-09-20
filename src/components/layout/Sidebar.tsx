"use client";

import { useLanguage } from "@/lib/i18n/context";
import { Wordmark } from "./Logo";
import { CommunitySelector } from "./CommunitySelector";
import { LanguageToggle } from "./LanguageToggle";
import { NavLink } from "./NavLink";
import { DESKTOP_NAV_ITEMS } from "./nav-items";

export function Sidebar() {
  const { language } = useLanguage();

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-ink/10 bg-cream px-4 py-6 md:flex">
      <Wordmark language={language} className="px-1 text-lg" />
      <CommunitySelector />
      <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
        {DESKTOP_NAV_ITEMS.map((item) => (
          <NavLink key={item.key} item={item} orientation="vertical" />
        ))}
      </nav>
      <LanguageToggle />
    </aside>
  );
}
