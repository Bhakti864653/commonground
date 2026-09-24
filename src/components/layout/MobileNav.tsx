"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";
import { NAV_ITEMS, isNavItemActive } from "./nav-items";

/** The reference's dark bottom bar on phones, rounded on top. */
export function MobileNav() {
  const pathname = usePathname();
  const { language } = useLanguage();

  return (
    <nav
      aria-label={FIELD.shell.navLabel[language]}
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-[20px] bg-sidebar px-1 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-8px_30px_#12352622] md:hidden"
    >
      <ul className="flex justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(item, pathname);
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[0.68rem] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime ${
                  active ? "text-lime" : "text-sidebar-text"
                }`}
              >
                <Icon aria-hidden="true" className="h-[22px] w-[22px]" strokeWidth={1.7} />
                <span className="text-center leading-tight">{item.label[language]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
