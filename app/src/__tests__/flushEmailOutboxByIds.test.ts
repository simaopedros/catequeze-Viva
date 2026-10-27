import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("wasp/server/auth", () => ({}));

import { flushEmailOutboxByIds } from "../server/scripts/flushEmailOutboxByIds";
import {
  deliverOutboxRowsByIds,
  type DeliverOutboxRowResult,
} from "../server/email/service";

vi.mock("../server/email/service", () => ({
  deliverOutboxRowsByIds: vi.fn(),
}));

const deliverMock = vi.mocked(deliverOutboxRowsByIds);

function prismaStub(rows: Record<string, { messageId: string }>) {
  return {
    emailMessage: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        rows[where.id] ? { messageId: rows[where.id].messageId } : null,
      ),
    },
    emailSuppression: {},
    emailPreference: {},
    user: {},
  } as any;
}

describe("flushEmailOutboxByIds seed", () => {
  const envKeys = ["EMAIL_OUTBOX_IDS", "EMAIL_OUTBOX_PAUSE_MS"] as const;
  const previous: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of envKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
      delete previous[key];
    }
    vi.clearAllMocks();
  });

  function setEnv(key: (typeof envKeys)[number], value: string | undefined) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  it("no-ops when EMAIL_OUTBOX_IDS is empty", async () => {
    setEnv("EMAIL_OUTBOX_IDS", "  ");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await flushEmailOutboxByIds(prismaStub({}));
    expect(deliverMock).not.toHaveBeenCalled();
    expect(log.mock.calls.some((c) => String(c[0]).includes("nothing to do")))
      .toBe(true);
    log.mockRestore();
  });

  it("calls deliverOutboxRowsByIds and logs id/messageId/outcome only", async () => {
    setEnv("EMAIL_OUTBOX_IDS", " id-a , id-b ");
    setEnv("EMAIL_OUTBOX_PAUSE_MS", "1500");

    const results: DeliverOutboxRowResult[] = [
      { id: "id-a", outcome: "SENT" },
      { id: "id-b", outcome: "SKIPPED" },
    ];
    deliverMock.mockResolvedValue(results);

    const prisma = prismaStub({
      "id-a": { messageId: "support.reply" },
      "id-b": { messageId: "support.reply" },
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await flushEmailOutboxByIds(prisma);

    expect(deliverMock).toHaveBeenCalledTimes(1);
    expect(deliverMock.mock.calls[0][0]).toEqual(["id-a", "id-b"]);
    expect(deliverMock.mock.calls[0][1]).toEqual({ pauseMs: 1500 });

    const joined = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toContain("id=id-a");
    expect(joined).toContain("messageId=support.reply");
    expect(joined).toContain("outcome=SENT");
    expect(joined).toContain("outcome=SKIPPED");
    expect(joined).not.toMatch(/@/);
    expect(joined).not.toMatch(/secret|password|api[_-]?key/i);

    log.mockRestore();
  });

  it("defaults pause to 20000 ms", async () => {
    setEnv("EMAIL_OUTBOX_IDS", "only-one");
    setEnv("EMAIL_OUTBOX_PAUSE_MS", undefined);
    deliverMock.mockResolvedValue([{ id: "only-one", outcome: "SENT" }]);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await flushEmailOutboxByIds(
      prismaStub({ "only-one": { messageId: "auth.verify" } }),
    );

    expect(deliverMock.mock.calls[0][1]).toEqual({ pauseMs: 20000 });
    log.mockRestore();
  });
});
