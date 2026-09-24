import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CommunityProvider } from "@/lib/community/context";
import { LanguageProvider } from "@/lib/i18n/context";
import { THEME_INIT_SCRIPT } from "@/lib/theme/theme";

// Body text in Inter; display type uses the system Georgia stack (see globals.css), matching the
// reference design's editorial serif without an extra font download.
const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
      className={`${body.variable} h-full antialiased`}
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
