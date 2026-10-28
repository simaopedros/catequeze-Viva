import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("wasp/server", () => ({
  HttpError: class extends Error {
    constructor(
      public statusCode: number,
      message?: string,
    ) {
      super(message);
    }
  },
  prisma: {},
}));
vi.mock("wasp/auth/user", () => ({ makeAuthUserIfPossible: vi.fn() }));
vi.mock("../server/auth/helpers", () => ({
  requireAuth: vi.fn(),
  assertCanAccessCatechumenProfile: vi.fn(),
  writeAuditLog: vi.fn(),
}));
vi.mock("../server/operations/sharedScope", () => ({
  requireWorkspaceAccess: vi.fn(),
  isCatechist: vi.fn(),
  isCoordinatorOrAbove: vi.fn(),
  catechumenWhereForAccess: vi.fn(),
}));
vi.mock("../server/auth/familySurface", () => ({
  loadActiveRoles: vi.fn().mockResolvedValue(["LEAD_CATECHIST"]),
  rolesAreFamilyOnly: () => false,
}));
vi.mock("../server/audit", () => ({ logAudit: vi.fn() }));
vi.mock("../server/storage/documentStorage", () => ({
  readDocumentFile: vi.fn().mockResolvedValue({ buffer: Buffer.from("file") }),
  deleteDocumentFile: vi.fn(),
  storeDocumentFile: vi.fn().mockResolvedValue("key"),
}));
vi.mock("../server/middleware/rateLimiter", () => ({
  documentAccessRateLimiter: vi.fn(),
  uploadRateLimiter: vi.fn(),
}));
vi.mock("../server/api/multipart", () => ({
  singleDocumentUpload: (_req: any, _res: any, next: any) => next(),
}));
import { requireWorkspaceAccess } from "../server/operations/sharedScope";
import {
  generateCatechumenUploadToken,
  getCatechumenByUploadToken,
} from "../server/operations/uploadTokenOperations";
import { serveDocument } from "../server/api/documents";
import { publicUploadDocument } from "../server/api/publicUpload";
const response = () => {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
    send: vi.fn(),
  };
  return res;
};
const future = () => new Date(Date.now() + 86400000);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireWorkspaceAccess).mockResolvedValue({
    workspaceId: "selected",
    isCatechist: true,
    allowedClassIds: ["class"],
  } as any);
});
describe("upload-only public capability", () => {
  it("returns only first name and accepted document types", async () => {
    const ctx = {
      entities: {
        CatechumenProfile: {
          findUnique: vi.fn().mockResolvedValue({
            id: "profile",
            firstName: "Teste",
            lastName: "Privado",
            documents: [{ id: "doc" }],
            uploadTokenExpires: future(),
          }),
        },
      },
    };
    const result = await getCatechumenByUploadToken(
      { token: "dto-fixture" },
      ctx,
    );
    expect(Object.keys(result).sort()).toEqual(["documentTypes", "firstName"]);
  });
  it.each([null, new Date(0), new Date(Date.now()), new Date("invalid")])(
    "rejects missing or expired validity %s",
    async (expiry) => {
      await expect(
        getCatechumenByUploadToken(
          { token: `expiry-${String(expiry)}` },
          {
            entities: {
              CatechumenProfile: {
                findUnique: vi
                  .fn()
                  .mockResolvedValue({ uploadTokenExpires: expiry }),
              },
            },
          },
        ),
      ).rejects.toMatchObject({ statusCode: 410 });
    },
  );
  it("does not serve documents using a public upload token", async () => {
    const res = response();
    await serveDocument(
      { params: { id: "doc" }, query: { token: "fixture" } } as any,
      res,
      {
        entities: {
          Document: {
            findUnique: vi.fn().mockResolvedValue({
              name: "file",
              catechumenProfileId: "profile",
              catechumenProfile: { uploadToken: "fixture" },
            }),
          },
          CatechumenProfile: {
            findUnique: vi
              .fn()
              .mockResolvedValue({ uploadTokenExpires: future() }),
          },
        },
      },
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).not.toHaveBeenCalled();
  });
  it("encodes unsafe document names in Content-Disposition", async () => {
    const res = response();
    await serveDocument({ params: { id: "doc" }, query: {} } as any, res, {
      user: { isAdmin: true },
      entities: {
        Document: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ name: 'ação"\r\n.pdf', s3Key: "key" }),
        },
      },
    });
    const header = res.setHeader.mock.calls.find(
      ([key]: any[]) => key === "Content-Disposition",
    )?.[1];
    expect(header).toBe("inline; filename*=UTF-8''a%C3%A7%C3%A3o%22%0D%0A.pdf");
  });
  it("rejects public uploads with no expiration", async () => {
    const res = response();
    const create = vi.fn().mockResolvedValue({ id: "doc" });
    await publicUploadDocument(
      {
        body: { token: "fixture", type: "OTHER" },
        file: {
          size: 5,
          buffer: Buffer.from("%PDF-"),
          mimetype: "application/pdf",
        },
      } as any,
      res,
      {
        entities: {
          CatechumenProfile: {
            findUnique: vi
              .fn()
              .mockResolvedValue({ id: "profile", uploadTokenExpires: null }),
          },
          Document: { create },
        },
      },
    );
    expect(res.status).toHaveBeenCalledWith(410);
    expect(create).not.toHaveBeenCalled();
  });
});

describe("public capability boundaries", () => {
  it("generates a token with a future expiration", async () => {
    const update = vi.fn();
    const before = Date.now();
    const result = await generateCatechumenUploadToken(
      { catechumenProfileId: "profile" },
      {
        user: { id: "admin", isAdmin: true },
        entities: {
          CatechumenProfile: {
            findUnique: vi.fn().mockResolvedValue({
              id: "profile",
              parishId: "selected",
              enrollments: [],
            }),
            update,
          },
        },
      },
    );
    expect(result.expires.getTime()).toBeGreaterThan(before);
    expect(result.expires.getTime()).toBeLessThanOrEqual(
      Date.now() + 8 * 86400000,
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { uploadToken: result.token, uploadTokenExpires: result.expires },
      }),
    );
  });
  it("limits repeated public lookups by token before querying the database", async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValue({ firstName: "Teste", uploadTokenExpires: future() });
    const ctx = {
      req: { ip: "192.0.2.10" },
      entities: { CatechumenProfile: { findUnique } },
    };
    for (let i = 0; i < 60; i++)
      await getCatechumenByUploadToken({ token: "rate-fixture" }, ctx);
    await expect(
      getCatechumenByUploadToken({ token: "rate-fixture" }, ctx),
    ).rejects.toMatchObject({ statusCode: 429 });
    expect(findUnique).toHaveBeenCalledTimes(60);
  });
  it("limits rotating tokens from the same IP", async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValue({ firstName: "Teste", uploadTokenExpires: future() });
    const ctx = {
      req: { ip: "192.0.2.11" },
      entities: { CatechumenProfile: { findUnique } },
    };
    for (let i = 0; i < 60; i++)
      await getCatechumenByUploadToken({ token: `rotate-${i}` }, ctx);
    await expect(
      getCatechumenByUploadToken({ token: "rotate-blocked" }, ctx),
    ).rejects.toMatchObject({ statusCode: 429 });
    expect(findUnique).toHaveBeenCalledTimes(60);
  });
  it.each([null, new Date(0)])(
    "rejects invalid upload expiry without storing files",
    async (expiry) => {
      const res = response();
      const create = vi.fn();
      await publicUploadDocument(
        {
          ip: "192.0.2.12",
          body: { token: `upload-expiry-${String(expiry)}`, type: "OTHER" },
          file: {
            size: 5,
            buffer: Buffer.from("%PDF-"),
            mimetype: "application/pdf",
          },
        } as any,
        res,
        {
          entities: {
            CatechumenProfile: {
              findUnique: vi.fn().mockResolvedValue({
                id: "profile",
                uploadTokenExpires: expiry,
              }),
            },
            Document: { create },
          },
        },
      );
      expect(res.status).toHaveBeenCalledWith(410);
      expect(create).not.toHaveBeenCalled();
    },
  );
  it("uploads with a valid token and returns only acknowledgement", async () => {
    const res = response();
    const create = vi.fn().mockResolvedValue({ id: "doc", name: "private" });
    await publicUploadDocument(
      {
        ip: "192.0.2.13",
        body: { token: "valid-upload", type: "OTHER" },
        file: {
          size: 5,
          buffer: Buffer.from("%PDF-"),
          mimetype: "application/pdf",
        },
      } as any,
      res,
      {
        entities: {
          CatechumenProfile: {
            findUnique: vi.fn().mockResolvedValue({
              id: "profile",
              parishId: "selected",
              uploadTokenExpires: future(),
            }),
          },
          Document: { create },
        },
      },
    );
    expect(create).toHaveBeenCalledOnce();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

it("returns HTTP 429 for repeated multipart requests before accessing records", async () => {
  const findUnique = vi.fn();
  const req = {
    ip: "192.0.2.99",
    body: { token: "upload-rate-fixture", type: "OTHER" },
  } as any;
  const ctx = { entities: { CatechumenProfile: { findUnique } } };
  for (let i = 0; i < 60; i++) await publicUploadDocument(req, response(), ctx);
  const res = response();
  await publicUploadDocument(req, res, ctx);
  expect(res.status).toHaveBeenCalledWith(429);
  expect(findUnique).not.toHaveBeenCalled();
});
