import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { MobileTopBar } from "./MobileTopBar";
import { MobileNav } from "./MobileNav";
import { Footer } from "./Footer";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <MobileTopBar />
      <main className="flex-1">{children}</main>
      <Footer />
      <MobileNav />
    </div>
  );
}
