import { readFileSync, existsSync } from "fs";
import path from "path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, screen, within, cleanup } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";

// The map needs a real browser (WebGL); the dashboard test only needs to know it rendered.
vi.mock("@/components/map/CommunityMap", () => ({ CommunityMap: () => <div data-testid="community-map" /> }));

import IntroductionPage from "@/app/page";
import DashboardPage from "@/app/(app)/home/page";
import { LandingPage } from "@/components/landing/LandingPage";
import { CommunityProvider } from "@/lib/community/context";
import { LanguageProvider, useLanguage } from "@/lib/i18n/context";
import { PlacesProvider } from "@/lib/places/context";
import { LANDING } from "@/lib/i18n/landing";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { FIELD } from "@/lib/i18n/field-notes";
import { LANGUAGE_CODES, type Language } from "@/lib/i18n/languages";
import { NAV_ITEMS } from "@/components/layout/nav-items";

const languageControl: { set?: (l: Language) => void } = {};
function LanguageGrabber() {
  const { setLanguage } = useLanguage();
  useEffect(() => {
    languageControl.set = setLanguage;
  }, [setLanguage]);
  return null;
}

function Providers({ children }: { children: ReactNode }) {
  return (
    <CommunityProvider>
      <LanguageProvider>
        <LanguageGrabber />
        {children}
      </LanguageProvider>
    </CommunityProvider>
  );
}

const hrefOf = (name: string | RegExp, scope: HTMLElement = document.body) =>
  within(scope)
    .getAllByRole("link", { name })
    .map((a) => a.getAttribute("href"));

// jsdom reports an English browser; most tests start from a Spanish one, like the pilot's residents.
function setBrowserLanguages(languages: string[]) {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(languages);
}

beforeEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setBrowserLanguages(["es-PA", "es"]);
});

describe("routes", () => {
  it("/ renders the public introduction, outside the app shell", async () => {
    await act(async () => {
      render(<IntroductionPage />, { wrapper: Providers });
    });
    expect(screen.getByRole("heading", { level: 1, name: UI_STRINGS.home.tagline.es })).toBeInTheDocument();
    // No sidebar/bottom-nav: the app shell's navigation landmark is absent.
    expect(screen.queryByRole("navigation", { name: FIELD.shell.navLabel.es })).not.toBeInTheDocument();
  });

  it("starts in the visitor's browser language when CommonGround speaks it", async () => {
    setBrowserLanguages(["en-CA", "fr-CA"]);
    await act(async () => {
      render(<IntroductionPage />, { wrapper: Providers });
    });
    expect(screen.getByRole("heading", { level: 1, name: UI_STRINGS.home.tagline.en })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
  });

  it("falls back to the pilot's Spanish for an unsupported browser language", async () => {
    setBrowserLanguages(["de-DE"]);
    await act(async () => {
      render(<IntroductionPage />, { wrapper: Providers });
    });
    expect(screen.getByRole("heading", { level: 1, name: UI_STRINGS.home.tagline.es })).toBeInTheDocument();
  });

  it("the introduction page lives outside the (app) group, and /home holds the dashboard", () => {
    const app = path.resolve(__dirname, "../../../app");
    expect(existsSync(path.join(app, "page.tsx"))).toBe(true);
    expect(existsSync(path.join(app, "(app)", "page.tsx"))).toBe(false);
    expect(existsSync(path.join(app, "(app)", "home", "page.tsx"))).toBe(true);
  });

  it("/home renders the existing community dashboard", async () => {
    await act(async () => {
      render(
        <PlacesProvider>
          <DashboardPage />
        </PlacesProvider>,
        { wrapper: Providers },
      );
    });
    expect(screen.getByText(FIELD.home.eyebrow.es)).toBeInTheDocument();
  });

  it("every app navigation Home link points at /home, and nothing in the app nav points at /", () => {
    expect(NAV_ITEMS.find((i) => i.key === "home")?.href).toBe("/home");
    expect(NAV_ITEMS.some((i) => i.href === "/")).toBe(false);
    const read = (f: string) => readFileSync(path.resolve(__dirname, "../../layout", f), "utf8");
    for (const file of ["Sidebar.tsx", "TopBar.tsx"]) {
      expect(read(file)).toContain('href="/home"');
      expect(read(file)).not.toContain('href="/"');
    }
  });
});

describe("landing page actions", () => {
  async function renderLanding() {
    await act(async () => {
      render(<LandingPage />, { wrapper: Providers });
    });
    await act(async () => languageControl.set?.("en"));
  }

  it("sends each call to action to its real route", async () => {
    await renderLanding();
    const t = LANDING;
    expect(new Set(hrefOf(t.hero.primary.en))).toEqual(new Set(["/home"]));
    expect(hrefOf(t.header.exploreGuest.en)).toContain("/home");
    expect(new Set(hrefOf(t.hero.secondary.en))).toEqual(new Set(["/report/new"]));
    expect(hrefOf(t.final.activity.en)).toEqual(["/activity"]);
    expect(hrefOf(t.final.learn.en)).toEqual(["/how-it-works"]);
    expect(hrefOf(new RegExp(t.guide.cta.en))).toEqual(["/guide"]);
    expect(hrefOf(t.header.homeLabel.en)).toEqual(["/"]);
    expect(screen.getByText(t.hero.noAccount.en)).toBeInTheDocument();
  });

  it("links only to routes that exist", async () => {
    await renderLanding();
    const app = path.resolve(__dirname, "../../../app");
    const routeFile = (href: string) =>
      href === "/" ? path.join(app, "page.tsx") : path.join(app, "(app)", ...href.slice(1).split("/"), "page.tsx");
    const internal = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href")!)
      .filter((h) => h.startsWith("/"));
    for (const href of new Set(internal)) {
      expect(existsSync(routeFile(href)), href).toBe(true);
    }
  });

  it("presents no login, sign-up, or account controls", async () => {
    await renderLanding();
    const controls = [...screen.getAllByRole("link"), ...screen.getAllByRole("button")];
    for (const el of controls) {
      expect(el.textContent ?? "").not.toMatch(/log ?in|sign ?in|sign ?up|register|create account|iniciar sesión|regístrate/i);
    }
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/password|contraseña/i)).not.toBeInTheDocument();
    // Accounts are explained honestly, as a future plan.
    expect(screen.getByText(LANDING.accounts.body.en)).toBeInTheDocument();
  });

  it("keeps primary actions keyboard reachable (real links, never removed from tab order)", async () => {
    await renderLanding();
    for (const name of [LANDING.hero.primary.en, LANDING.hero.secondary.en]) {
      for (const link of screen.getAllByRole("link", { name })) {
        expect(link.tagName).toBe("A");
        expect(link.getAttribute("tabindex")).not.toBe("-1");
        link.focus();
        expect(document.activeElement).toBe(link);
      }
    }
  });

  it("renders in all seven languages and keeps <html lang> in sync", async () => {
    await renderLanding();
    for (const lang of LANGUAGE_CODES) {
      await act(async () => languageControl.set?.(lang));
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(UI_STRINGS.home.tagline[lang]);
      expect(screen.getByText(LANDING.privacy.title[lang])).toBeInTheDocument();
      expect(document.documentElement.lang).toBeTruthy();
    }
    await act(async () => languageControl.set?.("zh"));
    expect(document.documentElement.lang).toBe("zh-Hans");
  });
});

describe("reduced motion", () => {
  it("the illustration's only animation is switched off under prefers-reduced-motion", async () => {
    await act(async () => {
      render(<LandingPage />, { wrapper: Providers });
    });
    const animated = document.querySelectorAll(".cg-flow");
    expect(animated.length).toBeGreaterThan(0);
    const css = readFileSync(path.resolve(__dirname, "../../../app/globals.css"), "utf8");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.cg-flow\s*\{\s*animation: none;/);
  });
});
