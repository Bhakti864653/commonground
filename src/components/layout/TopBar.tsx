"use client";

import Link from "next/link";
import { Asterisk, Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";
import { LogoMark } from "./Logo";
import { LocaleSwitch } from "./LocaleSwitch";
import { PlaceSelector } from "./PlaceSelector";
import { ThemeToggle } from "./ThemeToggle";

/**
 * "✳ YOUR COMMUNITY / [place]" on the left, the pilot label and "New case" on the right. On
 * phones (no sidebar) it also carries the logo, language, and theme controls; below 640px the
 * place moves to its own labeled row, so the community name is never cut to a few letters.
 */
export function TopBar() {
  const { language } = useLanguage();

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-2.5 border-b border-line bg-paper/95 px-[18px] py-3 backdrop-blur sm:h-[65px] sm:flex-nowrap sm:py-0 md:h-[76px] md:px-[clamp(20px,4vw,65px)]">
      <div className="order-1 flex min-w-0 items-center gap-2.5">
        <Link href="/home" className="shrink-0 rounded-lg md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal">
          <LogoMark tone="ink" className="h-8 w-8" />
          <span className="sr-only">CommonGround</span>
        </Link>
        <Asterisk aria-hidden="true" className="hidden h-6 w-6 shrink-0 text-[#e78b5f] md:block" strokeWidth={2.2} />
        <span className="hidden whitespace-nowrap text-[0.8rem] font-extrabold uppercase tracking-[0.11em] text-ink min-[900px]:inline">
          {FIELD.shell.communityLabel[language]}
        </span>
        <span aria-hidden="true" className="hidden text-2xl font-light text-line min-[900px]:inline">
          /
        </span>
      </div>

      <div className="order-3 flex w-full min-w-0 items-center gap-2.5 sm:order-2 sm:w-auto sm:flex-1">
        <span className="shrink-0 text-[0.68rem] font-extrabold uppercase tracking-[0.13em] text-caps sm:hidden">
          {FIELD.shell.communityLabel[language]}
        </span>
        <PlaceSelector compact />
      </div>

      <div className="order-2 ml-auto flex shrink-0 items-center gap-2.5 sm:order-3">
        <span className="hidden text-[0.68rem] font-extrabold uppercase tracking-[0.13em] text-caps min-[1100px]:inline">
          {FIELD.shell.pilotBadge[language]}
        </span>
        <div className="flex items-center gap-2 min-[1100px]:hidden">
          <LocaleSwitch />
          <ThemeToggle className="px-2.5 [&>svg]:hidden sm:[&>svg]:block" />
        </div>
        <Link
          href="/report/new"
          className="hidden items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-[0.8rem] font-extrabold text-paper hover:bg-ink/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal min-[900px]:inline-flex"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {FIELD.shell.newCase[language]}
        </Link>
      </div>
    </header>
  );
}
