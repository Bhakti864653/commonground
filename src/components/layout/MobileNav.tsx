"use client";

import { NavLink } from "./NavLink";
import { MOBILE_NAV_ITEMS } from "./nav-items";

export function MobileNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-ink/10 bg-cream pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {MOBILE_NAV_ITEMS.map((item) => (
        <NavLink key={item.key} item={item} orientation="horizontal" />
      ))}
    </nav>
  );
}
