import { describe, expect, it } from "vitest";
import { currentStage, stagesReached } from "@/lib/journey/stages";

describe("stages", () => {
  it("counts only stages actually reached", () => {
    expect(stagesReached("received")).toBe(1);
    expect(stagesReached("in_discussion")).toBe(3);
    expect(stagesReached("closed")).toBe(5);
  });

  it("never reports a stage beyond what the status reached", () => {
    expect(currentStage("received")).toBe("observed");
    expect(currentStage("not_verifiable")).toBe("reviewed");
    expect(currentStage("updated")).toBe("updated");
  });
});
