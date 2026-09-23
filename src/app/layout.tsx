import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { CommunityProvider } from "@/lib/community/context";
import { LanguageProvider } from "@/lib/i18n/context";
import { THEME_INIT_SCRIPT } from "@/lib/theme/theme";

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
    // suppressHydrationWarning: THEME_INIT_SCRIPT sets data-theme on <html> before React
    // hydrates, so the server's markup (no attribute) intentionally differs on that one element.
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <CommunityProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </CommunityProvider>
      </body>
    </html>
  );
}
