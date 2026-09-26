import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const requestCommunity = vi.fn();
vi.mock("@/lib/store/actions", () => ({ requestCommunity: (input: unknown) => requestCommunity(input) }));

import { CommunityRequestForm } from "@/components/map/CommunityRequestForm";
import { LanguageProvider } from "@/lib/i18n/context";
import { INFO } from "@/lib/i18n/community-info";

beforeEach(() => {
  cleanup();
  requestCommunity.mockReset();
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["en-CA"]);
});

function renderForm() {
  render(
    <LanguageProvider>
      <CommunityRequestForm placeName="Canada" />
    </LanguageProvider>,
  );
}

describe("CommunityRequestForm", () => {
  it("sends only the place, note, and language, then thanks without promising anything", async () => {
    requestCommunity.mockResolvedValue(true);
    renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: INFO.request.noteLabel.en }), { target: { value: "Potholes on my street" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Ask for CommonGround in Canada/ }));
    });
    expect(requestCommunity).toHaveBeenCalledWith({ placeName: "Canada", note: "Potholes on my street", language: "en" });
    expect(screen.getByRole("status").textContent).toContain("can't promise");
  });

  it("asks for no contact details and says so", () => {
    renderForm();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.getByText(INFO.request.privacy.en)).toBeInTheDocument();
  });

  it("shows an error and lets the visitor retry when sending fails", async () => {
    requestCommunity.mockImplementation(async () => {
      throw new Error("offline");
    });
    renderForm();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Ask for CommonGround in Canada/ }));
    });
    expect(screen.getByRole("alert").textContent).toBe(INFO.request.error.en);
    expect(screen.getByRole("button", { name: /Ask for CommonGround in Canada/ })).toBeEnabled();
  });
});
