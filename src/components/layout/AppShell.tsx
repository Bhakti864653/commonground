import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileTopBar } from "./MobileTopBar";
import { MobileNav } from "./MobileNav";
import { Footer } from "./Footer";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <Sidebar />
      <div className="flex min-h-full flex-1 flex-col">
        <MobileTopBar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <MobileNav />
    </div>
  );
}
