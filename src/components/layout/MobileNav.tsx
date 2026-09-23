"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";
import { EXPERIENCE } from "@/lib/i18n/experience";
import { MOBILE_NAV_ITEMS, isNavItemActive } from "./nav-items";

/** Bottom navigation below xl. "Create" is raised in the middle — the one primary action. */
export function MobileNav() {
  const pathname = usePathname();
  const { language } = useLanguage();

  return (
    <nav
      aria-label={EXPERIENCE.nav.menuLabel[language]}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur xl:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-end justify-between px-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(item, pathname);
          if (item.key === "create") {
            return (
              <li key={item.key} className="flex flex-1 justify-center">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="-mt-5 flex flex-col items-center gap-1 focus-visible:outline-none [&:focus-visible>span:first-child]:outline [&:focus-visible>span:first-child]:outline-2 [&:focus-visible>span:first-child]:outline-offset-2 [&:focus-visible>span:first-child]:outline-teal"
                >
                  <span className="flex h-13 w-13 items-center justify-center rounded-full bg-teal text-cream shadow-[0_10px_24px_-10px_rgba(14,94,87,0.8)] ring-4 ring-cream">
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <span className="pb-1.5 text-[11px] font-medium text-ink">{item.label[language]}</span>
                </Link>
              </li>
            );
          }
          return (
            <li key={item.key} className="flex flex-1 justify-center">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal ${
                  active ? "text-teal" : "text-ink/70"
                }`}
              >
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                {item.label[language]}
                <span aria-hidden="true" className={`mt-0.5 h-1 w-1 rounded-full ${active ? "bg-teal" : "bg-transparent"}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
