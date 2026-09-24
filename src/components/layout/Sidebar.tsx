"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Asterisk } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";
import { LogoMark, Wordmark } from "./Logo";
import { LocaleSwitch } from "./LocaleSwitch";
import { ThemeToggle } from "./ThemeToggle";
import { NAV_ITEMS, isNavItemActive } from "./nav-items";

/**
 * The reference's deep-green sidebar: full (220px) from 1100px, an icon rail from 768px, and
 * hidden on phones (MobileNav takes over). Labels stay available to screen readers on the rail.
 */
export function Sidebar() {
  const { language } = useLanguage();
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col gap-8 bg-sidebar px-3 py-7 text-[#f8f8f1] md:flex min-[1100px]:w-[220px] min-[1100px]:gap-6 min-[1100px]:px-[22px] min-[1100px]:py-8">
      <Link href="/" className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime">
        <Wordmark language={language} className="hidden min-[1100px]:flex" />
        <span className="flex justify-center min-[1100px]:hidden">
          <LogoMark className="h-9 w-9" />
          <span className="sr-only">CommonGround</span>
        </span>
      </Link>

      <p className="hidden items-end justify-between border-y border-sidebar-text/25 py-4 text-[0.58rem] font-extrabold uppercase leading-snug tracking-[0.14em] text-sidebar-text/80 min-[1100px]:flex">
        <span className="max-w-[7rem]">{FIELD.shell.sideIndex[language]}</span>
        <span>2026</span>
      </p>

      <nav aria-label={FIELD.shell.navLabel[language]} className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(item, pathname);
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={item.label[language]}
              className={`relative flex items-center justify-center gap-3 rounded-[14px] px-3 py-3.5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime min-[1100px]:justify-start ${
                active ? "bg-sidebar-active text-[#e7f6ae]" : "text-sidebar-text hover:bg-sidebar-hover hover:text-white"
              }`}
            >
              <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={1.7} />
              <span className="sr-only min-[1100px]:not-sr-only">{item.label[language]}</span>
              {active && (
                <Asterisk aria-hidden="true" className="absolute right-1 top-1 h-3 w-3 min-[1100px]:right-3 min-[1100px]:top-1/2 min-[1100px]:-translate-y-1/2" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden flex-col gap-4 min-[1100px]:flex">
        <div className="border-l-[3px] border-lime py-2 pl-3 text-[0.82rem] leading-snug text-sidebar-text">
          <strong className="mb-1 block text-lime">{FIELD.shell.sideNoteTitle[language]}</strong>
          {FIELD.shell.sideNote[language]}
        </div>
        <LocaleSwitch onDark className="w-full" />
        <ThemeToggle onDark />
      </div>
    </aside>
  );
}
