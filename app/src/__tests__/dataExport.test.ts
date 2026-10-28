import { beforeEach, describe, expect, it, vi } from "vitest";
const { db, transaction } = vi.hoisted(() => {
  const db = {
    $queryRaw: vi.fn(), dataExportRequest: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() }, user: { findUnique: vi.fn() },
    membership: { findMany: vi.fn() }, guardianProfile: { findUnique: vi.fn() },
  };
  return { db, transaction: vi.fn((fn) => fn(db)) };
});
vi.mock("wasp/server", () => ({
  prisma: { $transaction: transaction },
  HttpError: class extends Error { constructor(public statusCode: number, message: string) { super(message); } },
}));
vi.mock("../server/auth/helpers", () => ({
  requireAuth: (user: any) => { if (!user) throw Object.assign(new Error("Autenticação necessária."), { statusCode: 401 }); },
}));
import { downloadDataExport, getDataExportRequest, requestDataExport } from "../server/operations/dataExport";

const context = { user: { id: "owner" }, entities: { DataExportRequest: db.dataExportRequest } };
const request = () => ({ id: "export", userId: "owner", status: "READY", requestedAt: new Date(), expiresAt: new Date(Date.now() + 86400000), deliveredAt: null });
const response = () => ({ setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() });
beforeEach(() => {
  vi.clearAllMocks();
  db.$queryRaw.mockResolvedValue([{ id: "export" }]);
  db.dataExportRequest.findUnique.mockResolvedValue(request());
  db.dataExportRequest.findFirst.mockResolvedValue(null);
  db.dataExportRequest.create.mockImplementation(async ({ data }) => ({ id: "export", ...data }));
  db.user.findUnique.mockResolvedValue({ id: "owner" });
  db.membership.findMany.mockResolvedValue([]);
  db.guardianProfile.findUnique.mockResolvedValue(null);
});
describe("exportação autenticada", () => {
  it("dono baixa JSON e registra entrega e contador", async () => {
    const res = response();
    await downloadDataExport({ params: { id: "export" } }, res, context);
    expect(JSON.parse(res.send.mock.calls[0][0]).user.id).toBe("owner");
    expect(db.dataExportRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "DOWNLOADED", downloadCount: { increment: 1 }, deliveredAt: expect.any(Date), lastDownloadedAt: expect.any(Date) }),
    }));
    expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metadata: JSON.stringify({ operation: "DATA_EXPORT_DOWNLOADED" }) }) }));
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="meus-dados.json"');
  });
  it("outro usuário recebe 404 sem consultar dados pessoais", async () => {
    db.$queryRaw.mockImplementation(async (_sql, _id, userId) => userId === "owner" ? [{ id: "export" }] : []);
    await expect(downloadDataExport({ params: { id: "export" } }, response(), { ...context, user: { id: "other" } })).rejects.toMatchObject({ statusCode: 404 });
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.dataExportRequest.update).not.toHaveBeenCalled();
  });
  it("expirado retorna 410 e não entrega dados", async () => {
    db.dataExportRequest.findUnique.mockResolvedValue({ ...request(), expiresAt: new Date(0) });
    const res = response();
    await downloadDataExport({ params: { id: "export" } }, res, context);
    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.send).not.toHaveBeenCalled();
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.dataExportRequest.update).toHaveBeenCalledWith({ where: { id: "export" }, data: { status: "EXPIRED" } });
  });
  it("reaproveita pedido ativo sem renovar validade", async () => {
    const active = request();
    db.dataExportRequest.findFirst.mockResolvedValue(active);
    expect(await requestDataExport({}, context)).toMatchObject({ id: active.id, expiresAt: active.expiresAt, reused: true });
    expect(db.dataExportRequest.create).not.toHaveBeenCalled();
  });
  it("cria pedido pronto com validade de exatamente 7 dias", async () => {
    const result = await requestDataExport({}, context);
    expect(result.status).toBe("READY");
    expect(result.expiresAt.getTime() - result.requestedAt.getTime()).toBe(7 * 86400000);
    expect(db.$queryRaw).toHaveBeenCalled();
    expect(db.auditLog.create).toHaveBeenCalled();
  });
  it("projeta campos permitidos e não exporta credenciais", async () => {
    const source = { id: "owner", email: "fixture@example.test", inviteToken: "secret", hashedPassword: "secret", uploadToken: "secret" };
    const project = ({ select }: any) => Object.fromEntries(Object.keys(select).filter(key => key in source).map(key => [key, (source as any)[key]]));
    db.user.findUnique.mockImplementation(async (args) => project(args));
    db.membership.findMany.mockImplementation(async (args) => [project(args)]);
    db.guardianProfile.findUnique.mockImplementation(async (args) => project(args));
    const res = response();
    await downloadDataExport({ params: { id: "export" } }, res, context);
    const payload = res.send.mock.calls[0][0];
    expect(payload).toContain("fixture@example.test");
    expect(payload).not.toMatch(/secret|inviteToken|hashedPassword|uploadToken/);
    for (const delegate of [db.user.findUnique, db.membership.findMany, db.guardianProfile.findUnique]) {
      expect(delegate.mock.calls[0][0].where).toEqual(delegate === db.user.findUnique ? { id: "owner" } : { userId: "owner" });
    }
  });
  it("preserva primeira entrega em downloads posteriores", async () => {
    const deliveredAt = new Date(1000);
    db.dataExportRequest.findUnique.mockResolvedValue({ ...request(), status: "DOWNLOADED", deliveredAt });
    await downloadDataExport({ params: { id: "export" } }, response(), context);
    expect(db.dataExportRequest.update.mock.calls[0][0].data.deliveredAt).toBe(deliveredAt);
  });
  it("rejeita acesso sem autenticação", async () => {
    await expect(requestDataExport({}, {})).rejects.toMatchObject({ statusCode: 401 });
    await expect(downloadDataExport({ params: {} }, response(), {})).rejects.toMatchObject({ statusCode: 401 });
  });
  it("consulta só o pedido do usuário e mostra expiração", async () => {
    db.dataExportRequest.findFirst.mockResolvedValue({ ...request(), expiresAt: new Date(0) });
    expect(await getDataExportRequest({}, context)).toMatchObject({ status: "EXPIRED" });
    expect(db.dataExportRequest.findFirst).toHaveBeenCalledWith({ where: { userId: "owner" }, orderBy: { requestedAt: "desc" } });
  });
});
