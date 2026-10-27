import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/scripts/subscriptionExpirationJob", () => ({
  expireSubscriptionsJob: vi.fn(),
}));

import { expireSubscriptionsJob } from "../server/scripts/subscriptionExpirationJob";
import { subscriptionExpirationHandler } from "../server/api/subscriptionExpiration";

function makeResponse() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.setHeader = vi.fn(() => res);
  return res;
}

describe("subscriptionExpirationHandler", () => {
  const secret = "test-maintenance-secret";

  beforeEach(() => {
    process.env.MAINTENANCE_SECRET = secret;
    vi.mocked(expireSubscriptionsJob).mockReset();
    vi.mocked(expireSubscriptionsJob).mockResolvedValue({
      expiredCount: 2,
      remindersSent: 1,
    });
  });

  afterEach(() => {
    delete process.env.MAINTENANCE_SECRET;
  });

  it("returns 401 when the secret is wrong", async () => {
    const req = {
      headers: { "x-maintenance-secret": "wrong" },
      body: { confirm: "expire-trials" },
      query: {},
    } as any;
    const res = makeResponse();

    await subscriptionExpirationHandler(req, res, { entities: {} });

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ status: "unauthorized" });
    expect(expireSubscriptionsJob).not.toHaveBeenCalled();
  });

  it("returns 400 without confirm=expire-trials", async () => {
    const req = {
      headers: { "x-maintenance-secret": secret },
      body: {},
      query: {},
    } as any;
    const res = makeResponse();

    await subscriptionExpirationHandler(req, res, { entities: {} });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: "confirm-required" }),
    );
    expect(expireSubscriptionsJob).not.toHaveBeenCalled();
  });

  it("runs the job when confirm and secret are valid", async () => {
    const req = {
      headers: { "x-maintenance-secret": secret },
      body: { confirm: "expire-trials" },
      query: {},
    } as any;
    const res = makeResponse();
    const context = { entities: {} };

    await subscriptionExpirationHandler(req, res, context);

    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(expireSubscriptionsJob).toHaveBeenCalledWith(undefined, context);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        result: { expiredCount: 2, remindersSent: 1 },
        durationMs: expect.any(Number),
      }),
    );
  });
});

describe("maintenance stages", () => {
  it("no longer includes subscriptionExpiration", () => {
    const source = readFileSync(
      resolve(__dirname, "../server/api/maintenance.ts"),
      "utf8",
    );
    expect(source).not.toContain('name: "subscriptionExpiration"');
    expect(source).not.toContain("expireSubscriptionsJob");
    expect(source).toContain('name: "lifecycleNudge"');
    expect(source).toContain('name: "emailOutbox"');
  });
});
