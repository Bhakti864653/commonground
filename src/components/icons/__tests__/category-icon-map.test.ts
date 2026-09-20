import { describe, expect, it } from "vitest";
import { Droplet, MoreHorizontal } from "lucide-react";
import { getCategoryIcon } from "@/components/icons/category-icon-map";

describe("getCategoryIcon", () => {
  it("resolves a known key", () => {
    expect(getCategoryIcon("droplet")).toBe(Droplet);
  });

  it("falls back to a neutral marker for an unknown key instead of throwing", () => {
    expect(getCategoryIcon("some-future-category-icon")).toBe(MoreHorizontal);
  });
});
