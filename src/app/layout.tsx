import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Young_Serif } from "next/font/google";
import "./globals.css";
import { CommunityProvider } from "@/lib/community/context";
import { LanguageProvider } from "@/lib/i18n/context";
import { THEME_INIT_SCRIPT } from "@/lib/theme/theme";

// Body: designed by the Braille Institute for legibility — the right tool for a civic app read
// on inexpensive phones, often in bright sun. Display: a sturdy, slightly hand-cut serif with
// the feel of painted town signage. One weight only, so hierarchy comes from size.
const body = Atkinson_Hyperlegible_Next({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  // Next has no metrics to size-match a fallback for this family, so say so explicitly and
  // fall back to the system UI face while it loads.
  adjustFontFallback: false,
  fallback: ["system-ui", "sans-serif"],
});

const display = Young_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
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
      className={`${body.variable} ${display.variable} h-full antialiased`}
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
