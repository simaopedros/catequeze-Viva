import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const stores = new Map<string, Map<string, Response>>();
  const key = (request: any) =>
    typeof request === "string" ? request : request.url;
  const caches = {
    keys: async () => [...stores.keys()],
    delete: vi.fn(async (name: string) => stores.delete(name)),
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name)!;
      return {
        keys: async () => [...entries.keys()].map((url) => ({ url })),
        delete: async (request: any) => entries.delete(key(request)),
        put: async (request: any, response: Response) => {
          entries.set(key(request), response);
        },
        match: async (request: any) => entries.get(key(request))?.clone(),
      };
    },
  };
  const fetch = vi.fn().mockImplementation(
    async () =>
      new Response("synthetic", {
        headers: { "Cache-Control": "private, no-store" },
      }),
  );
  runInNewContext(
    readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"),
    {
      self: {
        location: { hostname: "test.invalid", origin: "https://test.invalid" },
        addEventListener: (name: string, handler: any) => {
          handlers[name] = handler;
        },
        clients: { claim: vi.fn() },
        skipWaiting: vi.fn(),
      },
      caches,
      fetch,
      URL,
      Response,
    },
  );
  return {
    caches,
    stores,
    fetch,
    request(path: string) {
      let result!: Promise<Response>;
      handlers.fetch({
        request: {
          url: `https://test.invalid${path}`,
          method: "GET",
          mode: "cors",
        },
        respondWith: (value: Promise<Response>) => {
          result = value;
        },
      });
      return result;
    },
    async dispatch(name: string, data?: any) {
      let pending: Promise<any> | undefined;
      handlers[name]({
        data,
        waitUntil: (promise: Promise<any>) => {
          pending = promise;
        },
      });
      await pending;
    },
  };
}

describe("C-09: private responses never survive in the service worker", () => {
  it.each([
    "/api/documents/synthetic",
    "/api/official-resources/attachments/synthetic",
    "/api/profile",
  ])("does not return %s offline to the next session", async (path) => {
    const sw = worker();
    expect(await (await sw.request(path)).text()).toBe("synthetic");
    expect(sw.fetch).toHaveBeenCalledWith(expect.anything(), { cache: "no-store" });
    sw.fetch.mockRejectedValue(new Error("offline"));
    await expect(sw.request(path)).rejects.toThrow("offline");
    expect([...sw.stores.values()].every((entries) => entries.size === 0)).toBe(
      true,
    );
  });

  it.each(["private", "no-store", "PRIVATE, max-age=60"])(
    "respects Cache-Control %s outside API too",
    async (directive) => {
      const sw = worker();
      sw.fetch.mockResolvedValue(
        new Response("synthetic", { headers: { "Cache-Control": directive } }),
      );
      await sw.request("/images/private.png");
      sw.fetch.mockRejectedValue(new Error("offline"));
      await expect(sw.request("/images/private.png")).rejects.toThrow();
    },
  );

  it("never stores API responses even without privacy headers", async () => {
    const sw = worker();
    sw.fetch.mockResolvedValue(new Response("synthetic"));
    await sw.request("/api/profile");
    sw.fetch.mockRejectedValue(new Error("offline"));
    await expect(sw.request("/api/profile")).rejects.toThrow("offline");
  });

  it("preserves static assets offline", async () => {
    const sw = worker();
    sw.fetch.mockResolvedValue(new Response("static"));
    await sw.request("/assets/app.js");
    sw.fetch.mockRejectedValue(new Error("offline"));
    expect(await (await sw.request("/assets/app.js")).text()).toBe("static");
  });

  it.each(["activate", "message"])(
    "purges legacy API entries on %s and retains current static assets",
    async (event) => {
      const sw = worker();
      const old = await sw.caches.open("catequese-viva-v6");
      await old.put(
        "https://test.invalid/api/documents/synthetic",
        new Response("old"),
      );
      const current = await sw.caches.open("catequese-viva-v7");
      await current.put(
        "https://test.invalid/api/profile",
        new Response("old"),
      );
      await current.put(
        "https://test.invalid/assets/app.js",
        new Response("static"),
      );
      await sw.dispatch(event, { type: "CLEAR_PRIVATE_CACHES" });
      for (const entries of sw.stores.values()) {
        expect(
          [...entries.keys()].some((url) =>
            new URL(url).pathname.startsWith("/api"),
          ),
        ).toBe(false);
      }
      expect(
        await (await current.match(
          "https://test.invalid/assets/app.js",
        ))!.text(),
      ).toBe("static");
    },
  );
});

vi.mock("wasp/server", () => ({
  HttpError: class extends Error {},
  prisma: {},
}));
vi.mock("wasp/client/auth", () => ({ logout: vi.fn() }));
vi.mock("../auth/intendedPath", () => ({ clearIntendedPath: vi.fn() }));
vi.mock("wasp/auth/user", () => ({ makeAuthUserIfPossible: vi.fn() }));
vi.mock("../server/middleware/rateLimiter", () => ({
  documentAccessRateLimiter: vi.fn(),
}));
vi.mock("../server/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("../server/auth/helpers", () => ({
  assertCanAccessCatechumenProfile: vi.fn(),
}));
vi.mock("../server/operations/sharedScope", () => ({
  resolveWorkspaceAccess: vi.fn(),
}));
vi.mock("../server/storage/documentStorage", () => ({
  readDocumentFile: vi
    .fn()
    .mockResolvedValue({ buffer: Buffer.from("synthetic") }),
}));
vi.mock("../server/api/multipart", () => ({ singleDocumentUpload: vi.fn() }));
vi.mock("../server/operations/resourceScope", () => ({
  actorCanViewOfficialResource: vi.fn().mockReturnValue(true),
  resolveResourceActor: vi.fn(),
  resolveActorForResource: vi.fn(),
  assertCanManageOwned: vi.fn(),
}));
import { signOut } from "../client/auth/signOut";
import { logout } from "wasp/client/auth";
import { serveDocument } from "../server/api/documents";
import { serveOfficialResourceAttachment } from "../server/api/officialResourceAttachments";
import { assertCanAccessCatechumenProfile } from "../server/auth/helpers";

it("logout removes old API responses without losing static assets, including without a SW", async () => {
  const sw = worker();
  const cache = await sw.caches.open("catequese-viva-v6");
  await cache.put(
    "https://test.invalid/api/documents/synthetic",
    new Response("synthetic"),
  );
  await cache.put("https://test.invalid/assets/app.js", new Response("static"));
  vi.stubGlobal("window", {
    caches: sw.caches,
    navigator: {},
    localStorage: { removeItem: vi.fn() },
    sessionStorage: { setItem: vi.fn() },
  });
  try {
    await signOut();
    expect(
      await cache.match("https://test.invalid/api/documents/synthetic"),
    ).toBeUndefined();
    expect(
      await cache.match("https://test.invalid/assets/app.js"),
    ).toBeDefined();
    expect(logout).toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});

it("logout requests cleanup from the controlling worker", async () => {
  const postMessage = vi.fn();
  vi.stubGlobal("window", {
    navigator: { serviceWorker: { controller: { postMessage } } },
  });
  try {
    await signOut();
    expect(postMessage).toHaveBeenCalledWith({ type: "CLEAR_PRIVATE_CACHES" });
  } finally {
    vi.unstubAllGlobals();
  }
});

function response() {
  return {
    setHeader: vi.fn(),
    send: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
}

it.each([
  "coordinator",
  "assigned-catechist",
  "own-household-guardian",
  "admin",
])(
  "keeps authorized %s downloads online and marks them private",
  async (role) => {
    vi.mocked(assertCanAccessCatechumenProfile).mockResolvedValue(undefined);
    const res = response();
    await serveDocument(
      { params: { id: "synthetic" }, query: {} } as any,
      res as any,
      {
        user: { id: role, isAdmin: role === "admin" },
        entities: {
          Document: {
            findUnique: vi
              .fn()
              .mockResolvedValue({
                id: "synthetic",
                catechumenProfileId: "synthetic-profile",
                name: "file.pdf",
                s3Key: "synthetic",
              }),
          },
        },
      },
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "private, no-store",
    );
    expect(res.send).toHaveBeenCalledWith(Buffer.from("synthetic"));
  },
);

it("marks authorized official attachment downloads private", async () => {
  const res = response();
  await serveOfficialResourceAttachment(
    { params: { id: "synthetic" }, query: {} } as any,
    res as any,
    {
      user: { id: "synthetic" },
      entities: {
        OfficialResourceAttachment: {
          findUnique: vi
            .fn()
            .mockResolvedValue({
              name: "file.pdf",
              s3Key: "synthetic",
              resource: {},
            }),
        },
      },
    },
  );
  expect(res.setHeader).toHaveBeenCalledWith(
    "Cache-Control",
    "private, no-store",
  );
  expect(res.send).toHaveBeenCalledWith(Buffer.from("synthetic"));
});
