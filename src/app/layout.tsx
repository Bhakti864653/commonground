import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { CommunityProvider } from "@/lib/community/context";
import { LanguageProvider } from "@/lib/i18n/context";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CommonGround",
  description: "Turn local knowledge into shared action.",
};

/**
 * Fonts/providers only — the resident-facing sidebar/nav/footer (AppShell) lives in
 * `(app)/layout.tsx`, not here, so `admin/` (a sibling of `(app)`, both under this root
 * layout) never gets the resident shell. Matches the (public)/(app)/admin split
 * ARCHITECTURE.md always described.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} h-full antialiased`}>
      <body className="min-h-full">
        <CommunityProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </CommunityProvider>
      </body>
    </html>
  );
}
