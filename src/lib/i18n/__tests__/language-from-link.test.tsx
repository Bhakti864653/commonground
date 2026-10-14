// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

describe("a link can choose the language (?lang=es)", () => {
  it("reads only a language the interface speaks", async () => {
    const { languageFromUrl } = await import("../context");
    expect(languageFromUrl("?lang=es")).toBe("es");
    expect(languageFromUrl("?lang=fr&x=1")).toBe("fr");
    expect(languageFromUrl("?lang=xx")).toBeNull();
    expect(languageFromUrl("")).toBeNull();
  });

  it("opens the site in Spanish even when the browser prefers English", async () => {
    vi.resetModules();
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["en-US", "en"]);
    window.history.replaceState(null, "", "/?lang=es");
    const { LanguageProvider, useLanguage } = await import("../context");
    function Show() {
      return <p>{useLanguage().language}</p>;
    }
    render(
      <LanguageProvider>
        <Show />
      </LanguageProvider>,
    );
    expect(await screen.findByText("es")).toBeInTheDocument();
    window.history.replaceState(null, "", "/");
  });
});
