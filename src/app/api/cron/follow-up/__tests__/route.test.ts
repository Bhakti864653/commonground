// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const runFollowUp = vi.fn(async () => ({ trigger: "cron", flagged: [], summaries: [], routedCatchUp: [], skippedForTime: 0, notes: [] }));
vi.mock("@/lib/pipeline/pipeline", () => ({ runFollowUp: () => runFollowUp() }));

import { GET } from "../route";
import { isAuthorizedCron } from "@/lib/pipeline/cron-auth";

const call = (auth?: string) => GET(new Request("http://localhost/api/cron/follow-up", auth ? { headers: { authorization: auth } } : {}));

afterEach(() => {
  vi.unstubAllEnvs();
  runFollowUp.mockClear();
});

describe("the follow-up cron route", () => {
  it("runs only with the right secret", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(runFollowUp).not.toHaveBeenCalled();
    const ok = await call("Bearer s3cret-value");
    expect(ok.status).toBe(200);
    expect(runFollowUp).toHaveBeenCalledOnce();
  });

  it("refuses everyone when no secret is configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(401);
    expect(isAuthorizedCron("Bearer undefined", undefined)).toBe(false);
    expect(runFollowUp).not.toHaveBeenCalled();
  });
});
