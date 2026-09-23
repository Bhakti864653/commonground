"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { EXPERIENCE } from "@/lib/i18n/experience";
import { Wordmark } from "./Logo";
import { CommunitySelector } from "./CommunitySelector";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { DESKTOP_NAV_ITEMS, isNavItemActive } from "./nav-items";

/** Desktop header (xl and up). Below xl, MobileTopBar + MobileNav take over. */
export function SiteHeader() {
  const { language } = useLanguage();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 hidden border-b border-ink/10 bg-cream/90 backdrop-blur xl:block">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-8 py-3">
        <Link href="/" className="rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal">
          <Wordmark language={language} />
        </Link>

        <nav aria-label={EXPERIENCE.nav.menuLabel[language]} className="flex items-center gap-1">
          {DESKTOP_NAV_ITEMS.map((item) => {
            const active = isNavItemActive(item, pathname);
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal ${
                  active ? "bg-mint text-teal" : "text-ink/80 hover:bg-mint/60 hover:text-ink"
                }`}
              >
                {item.label[language]}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <CommunitySelector compact />
          <LanguageToggle />
          <ThemeToggle />
          <Link
            href="/report/new"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-teal px-4 py-2 text-sm font-medium text-cream hover:bg-teal/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            {EXPERIENCE.nav.report[language]}
          </Link>
        </div>
      </div>
    </header>
  );
}
