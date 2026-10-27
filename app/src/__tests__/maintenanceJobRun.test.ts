import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../analytics/stats", () => ({
  calculateDailyStats: vi.fn().mockResolvedValue({ id: 1 }),
}));
vi.mock("../server/scripts/aiCacheCleanupJob", () => ({
  cleanupAiCacheJob: vi.fn().mockResolvedValue({ deleted: 0 }),
}));
vi.mock("../server/scripts/aiCreditsResetJob", () => ({
  resetAiCreditsJob: vi.fn().mockResolvedValue({ reset: 0 }),
}));
vi.mock("../server/scripts/remindersJob", () => ({
  sendRemindersJob: vi.fn().mockResolvedValue({ sent: 0 }),
}));
vi.mock("../server/scripts/socialMediaReconcileJob", () => ({
  reconcileSocialMediaJob: vi.fn().mockResolvedValue({ reconciled: 0 }),
}));
vi.mock("../server/scripts/lifecycleNudgeJob", () => ({
  lifecycleNudgeJob: vi.fn().mockResolvedValue({ sent: 0 }),
}));
vi.mock("../server/email/service", () => ({
  processEmailOutbox: vi.fn().mockResolvedValue({ processed: 0 }),
}));
vi.mock("../server/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { calculateDailyStats } from "../analytics/stats";
import { maintenanceHandler } from "../server/api/maintenance";
import { lifecycleNudgeJob } from "../server/scripts/lifecycleNudgeJob";

function makeResponse() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.setHeader = vi.fn(() => res);
  return res;
}

describe("maintenanceHandler JobRun recording", () => {
  const secret = "test-maintenance-secret";

  beforeEach(() => {
    process.env.MAINTENANCE_SECRET = secret;
    vi.mocked(calculateDailyStats).mockClear();
    vi.mocked(lifecycleNudgeJob).mockClear();
  });

  afterEach(() => {
    delete process.env.MAINTENANCE_SECRET;
  });

  it("records JobRun start/finish for each task including dailyStats", async () => {
    const created: any[] = [];
    const updated: any[] = [];
    const JobRun = {
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `run-${created.length + 1}`, ...data };
        created.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        updated.push({ where, data });
        return { id: where.id, ...data };
      }),
    };

    const req = {
      headers: { "x-maintenance-secret": secret },
    } as any;
    const res = makeResponse();

    await maintenanceHandler(req, res, { entities: { JobRun } });

    expect(res.status).toHaveBeenCalledWith(200);
    const names = created.map((row) => row.name).sort();
    expect(names).toEqual(
      [
        "aiCacheCleanup",
        "aiCreditsReset",
        "dailyStats",
        "emailOutbox",
        "lifecycleNudge",
        "meetingReminders",
        "socialMediaReconcile",
      ].sort(),
    );
    expect(updated.length).toBe(created.length);
    expect(updated.every((row) => row.data.ok === true)).toBe(true);
    expect(updated.every((row) => row.data.finishedAt instanceof Date)).toBe(true);
    expect(calculateDailyStats).toHaveBeenCalled();
  });

  it("does not change lifecycle email cap wiring", () => {
    const source = readFileSync(
      resolve(__dirname, "../server/scripts/lifecycleNudgeJob.ts"),
      "utf8",
    );
    expect(source).toContain("DEFAULT_LIFECYCLE_MAX_PER_RUN = 10");
  });
});

describe("maintenance source contracts", () => {
  it("wraps tasks with recordJobRun and still runs dailyStats", () => {
    const source = readFileSync(
      resolve(__dirname, "../server/api/maintenance.ts"),
      "utf8",
    );
    expect(source).toContain("recordJobRun");
    expect(source).toContain('name: "dailyStats"');
    expect(source).toContain("calculateDailyStats");
  });
});
