import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("wasp/server/auth", () => ({}));

import {
  classifyTrialExtensionSkip,
  isTrialExtDryRun,
  parseTrialExtPauseMs,
  parseTrialExtUserIds,
  sendTrialExtensionNotice,
} from "../server/scripts/sendTrialExtensionNotice";
import {
  resolveTrialExtensionCtaPath,
  resolveTrialExtensionCopy,
  selectTrialExtensionVariant,
  TRIAL_EXTENSION_CAMPAIGN,
  TRIAL_EXTENSION_COPY,
  TRIAL_EXTENSION_FALLBACK_CLASS,
  TRIAL_EXTENSION_FALLBACK_NAME,
} from "../server/lifecycle/trialExtensionNoticeCopy";
import {
  deliverOutboxRowsByIds,
  enqueueEmail,
} from "../server/email/service";

vi.mock("../server/email/service", () => ({
  enqueueEmail: vi.fn(),
  deliverOutboxRowsByIds: vi.fn(),
}));

const enqueueMock = vi.mocked(enqueueEmail);
const deliverMock = vi.mocked(deliverOutboxRowsByIds);

describe("trial extension variant + copy", () => {
  it("selects A when user has a class in a membership parish, else B", () => {
    expect(selectTrialExtensionVariant(true)).toBe("A");
    expect(selectTrialExtensionVariant(false)).toBe("B");
  });

  it("resolves CTA paths for A and B", () => {
    expect(resolveTrialExtensionCtaPath("B")).toBe("/app/classes/new");
    expect(resolveTrialExtensionCtaPath("A")).toBe("/app");
    expect(resolveTrialExtensionCtaPath("A", "class-1")).toBe(
      "/app/classes/class-1",
    );
  });

  it("interpolates pt-BR copy with fallbacks", () => {
    const a = resolveTrialExtensionCopy("A", {
      nome: "",
      data: "31/10/2026",
      turma: "",
    });
    expect(a.subject).toBe(TRIAL_EXTENSION_COPY.A.subject);
    expect(a.body).toContain(TRIAL_EXTENSION_FALLBACK_NAME);
    expect(a.body).toContain(TRIAL_EXTENSION_FALLBACK_CLASS);
    expect(a.body).toContain("31/10/2026");
    expect(a.preheader).toContain("31/10/2026");
    expect(a.cta).toBe("Abrir minha turma");

    const b = resolveTrialExtensionCopy("B", {
      nome: "Ana",
      data: "01/11/2026",
      turma: "ignored",
    });
    expect(b.subject).toBe(TRIAL_EXTENSION_COPY.B.subject);
    expect(b.body).toContain("Ana");
    expect(b.body).toContain("01/11/2026");
    expect(b.cta).toBe("Criar minha turma");
  });
});

describe("trial extension skip classification", () => {
  it("skips opt-out and already-sent (idempotency)", () => {
    expect(
      classifyTrialExtensionSkip({
        email: "a@b.com",
        lifecycleEmailsOptOutAt: new Date(),
      }),
    ).toBe("opt_out");

    expect(
      classifyTrialExtensionSkip({
        email: "a@b.com",
        lifecycleEmailLogs: [{ campaign: TRIAL_EXTENSION_CAMPAIGN }],
      }),
    ).toBe("already");
  });

  it("skips missing user, no email, and admin", () => {
    expect(classifyTrialExtensionSkip(null)).toBe("not_found");
    expect(classifyTrialExtensionSkip({ email: null })).toBe("no_email");
    expect(
      classifyTrialExtensionSkip({ email: "a@b.com", isAdmin: true }),
    ).toBe("admin");
  });

  it("allows eligible users", () => {
    expect(
      classifyTrialExtensionSkip({
        email: "a@b.com",
        isAdmin: false,
        lifecycleEmailsOptOutAt: null,
        lifecycleEmailLogs: [],
      }),
    ).toBeNull();
  });
});

describe("sendTrialExtensionNotice seed env helpers", () => {
  it("parses ids, dry-run default, and pause", () => {
    expect(parseTrialExtUserIds(" a , b ,a ")).toEqual(["a", "b"]);
    expect(isTrialExtDryRun(undefined)).toBe(true);
    expect(isTrialExtDryRun("1")).toBe(true);
    expect(isTrialExtDryRun("0")).toBe(false);
    expect(parseTrialExtPauseMs(undefined)).toBe(15000);
    expect(parseTrialExtPauseMs("500")).toBe(500);
  });
});

describe("sendTrialExtensionNotice seed", () => {
  const envKeys = [
    "TRIAL_EXT_USER_IDS",
    "TRIAL_EXT_DRY_RUN",
    "TRIAL_EXT_PAUSE_MS",
  ] as const;
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

  function prismaForUser(user: any) {
    return {
      user: {
        findUnique: vi.fn(async () => user),
      },
      catechesisClass: {
        findFirst: vi.fn(async () =>
          user?.memberships?.length
            ? { id: "class-1", name: "Turma 1" }
            : null,
        ),
      },
      lifecycleEmailLog: {
        create: vi.fn(async () => ({ id: "log-1" })),
      },
      emailMessage: {},
      emailSuppression: {},
      emailPreference: {},
      membership: {},
    } as any;
  }

  it("dry-run sends nothing (no enqueue / deliver)", async () => {
    setEnv("TRIAL_EXT_USER_IDS", "user-1");
    setEnv("TRIAL_EXT_DRY_RUN", "1");
    setEnv("TRIAL_EXT_PAUSE_MS", "0");

    const prisma = prismaForUser({
      id: "user-1",
      email: "a@b.com",
      firstName: "Ana",
      createdAt: new Date("2026-10-01T12:00:00Z"),
      trialEndsAt: new Date("2026-10-31T12:00:00Z"),
      isAdmin: false,
      lifecycleEmailsOptOutAt: null,
      lifecycleEmailLogs: [],
      memberships: [{ parishId: "p1" }],
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const counts = await sendTrialExtensionNotice(prisma);

    expect(enqueueMock).not.toHaveBeenCalled();
    expect(deliverMock).not.toHaveBeenCalled();
    expect(prisma.lifecycleEmailLog.create).not.toHaveBeenCalled();
    expect(counts.considered).toBe(1);
    expect(counts.sent).toBe(0);
    expect(counts.variantA).toBe(1);

    const joined = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toContain("status=dry_run");
    expect(joined).not.toMatch(/@/);
    expect(joined).not.toContain("Ana");
    log.mockRestore();
  });

  it("skips opt-out without enqueue or LifecycleEmailLog", async () => {
    setEnv("TRIAL_EXT_USER_IDS", "user-opt");
    setEnv("TRIAL_EXT_DRY_RUN", "0");
    setEnv("TRIAL_EXT_PAUSE_MS", "0");

    const prisma = prismaForUser({
      id: "user-opt",
      email: "opt@b.com",
      firstName: "Opt",
      createdAt: new Date(),
      trialEndsAt: new Date(),
      isAdmin: false,
      lifecycleEmailsOptOutAt: new Date(),
      lifecycleEmailLogs: [],
      memberships: [],
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const counts = await sendTrialExtensionNotice(prisma);

    expect(enqueueMock).not.toHaveBeenCalled();
    expect(prisma.lifecycleEmailLog.create).not.toHaveBeenCalled();
    expect(counts.skipped_optout).toBe(1);
    expect(counts.sent).toBe(0);
    log.mockRestore();
  });

  it("skips already-sent campaign (idempotency)", async () => {
    setEnv("TRIAL_EXT_USER_IDS", "user-done");
    setEnv("TRIAL_EXT_DRY_RUN", "0");
    setEnv("TRIAL_EXT_PAUSE_MS", "0");

    const prisma = prismaForUser({
      id: "user-done",
      email: "done@b.com",
      firstName: "Done",
      createdAt: new Date(),
      trialEndsAt: new Date(),
      isAdmin: false,
      lifecycleEmailsOptOutAt: null,
      lifecycleEmailLogs: [{ campaign: TRIAL_EXTENSION_CAMPAIGN }],
      memberships: [],
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const counts = await sendTrialExtensionNotice(prisma);

    expect(enqueueMock).not.toHaveBeenCalled();
    expect(counts.skipped_already).toBe(1);
    log.mockRestore();
  });

  it("enqueues, delivers, and logs on live send (variant B)", async () => {
    setEnv("TRIAL_EXT_USER_IDS", "user-b");
    setEnv("TRIAL_EXT_DRY_RUN", "0");
    setEnv("TRIAL_EXT_PAUSE_MS", "0");

    enqueueMock.mockResolvedValue({ id: "msg-1", status: "QUEUED" });
    deliverMock.mockResolvedValue([{ id: "msg-1", outcome: "SENT" }]);

    const prisma = prismaForUser({
      id: "user-b",
      email: "b@b.com",
      firstName: "Bia",
      createdAt: new Date("2026-10-01T12:00:00Z"),
      trialEndsAt: new Date("2026-11-01T12:00:00Z"),
      isAdmin: false,
      lifecycleEmailsOptOutAt: null,
      lifecycleEmailLogs: [],
      memberships: [],
    });
    prisma.catechesisClass.findFirst = vi.fn(async () => null);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const counts = await sendTrialExtensionNotice(prisma);

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock.mock.calls[0][0].messageId).toBe(
      "lifecycle.trial_extension_2026_10",
    );
    expect(enqueueMock.mock.calls[0][0].idempotencyKey).toBe(
      `lifecycle.${TRIAL_EXTENSION_CAMPAIGN}:user-b`,
    );
    expect(enqueueMock.mock.calls[0][0].payload.variant).toBe("B");
    expect(deliverMock).toHaveBeenCalledWith(
      ["msg-1"],
      { pauseMs: 0 },
      expect.anything(),
    );
    expect(prisma.lifecycleEmailLog.create).toHaveBeenCalledWith({
      data: {
        userId: "user-b",
        campaign: TRIAL_EXTENSION_CAMPAIGN,
        sentAt: expect.any(Date),
      },
    });
    expect(counts.sent).toBe(1);
    expect(counts.variantB).toBe(1);

    const joined = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).not.toMatch(/@/);
    expect(joined).not.toContain("Bia");
    log.mockRestore();
  });
});
