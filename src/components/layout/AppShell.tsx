import type { ReactNode } from "react";
import { PlacesProvider } from "@/lib/places/context";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { Footer } from "./Footer";
import { StarterNotice } from "./StarterNotice";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <PlacesProvider>
      <div className="flex min-h-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="mx-auto w-full max-w-[1700px] flex-1 px-[17px] pb-8 pt-8 md:px-[clamp(20px,4vw,65px)] md:pt-[55px]">
            <StarterNotice />
            {children}
          </main>
          <Footer />
        </div>
      </div>
      <MobileNav />
    </PlacesProvider>
  );
}
