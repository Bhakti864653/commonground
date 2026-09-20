"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import type { NavItem } from "./nav-items";

/**
 * Shared between Sidebar and MobileNav. An item with no href yet renders disabled with a
 * "coming soon" tag instead of linking to a page that doesn't exist — see nav-items.ts.
 */
export function NavLink({
  item,
  orientation,
}: {
  item: NavItem;
  orientation: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const Icon = item.icon;
  // Compare only the path, since some items carry a `?type=` query the pathname never includes.
  const isActive = item.href !== null && pathname === item.href.split("?")[0];

  const content = (
    <>
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      <span className={orientation === "horizontal" ? "text-[11px] leading-tight" : "text-sm"}>
        {item.label[language]}
      </span>
      {item.href === null && (
        <span className="text-[10px] font-medium text-slate">
          {UI_STRINGS.comingSoon[language]}
        </span>
      )}
    </>
  );

  const sharedClasses =
    orientation === "horizontal"
      ? "flex flex-1 flex-col items-center gap-0.5 py-1.5"
      : "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium";

  if (item.href === null) {
    return (
      <span
        aria-disabled="true"
        className={`${sharedClasses} cursor-default text-slate/70`}
        title={UI_STRINGS.comingSoon[language]}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={`${sharedClasses} ${
        isActive ? "bg-mint text-teal" : "text-ink hover:bg-mint/60"
      } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal`}
      aria-current={isActive ? "page" : undefined}
    >
      {content}
    </Link>
  );
}
