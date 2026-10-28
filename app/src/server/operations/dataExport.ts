import { HttpError, prisma } from "wasp/server";
import { requireAuth } from "../auth/helpers";

const sevenDays = 7 * 24 * 60 * 60 * 1000;

// Audit writes share the transaction: delivery must not succeed without its record.
async function audit(db: any, userId: string, id: string, operation: string) {
  await db.auditLog.create({
    data: {
      action: "EXPORT", entityType: "DataExportRequest", entityId: id,
      userId, metadata: JSON.stringify({ operation }),
    },
  });
}

export const requestDataExport = async (_args: unknown, context: any) => {
  requireAuth(context.user);
  return prisma.$transaction(async (db: any) => {
    // Serialize requests for this user, including requests from different processes.
    await db.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${context.user.id} FOR UPDATE`;
    const now = new Date();
    const active = await db.dataExportRequest.findFirst({
      where: { userId: context.user.id, expiresAt: { gt: now }, status: { in: ["REQUESTED", "READY", "DOWNLOADED"] } },
      orderBy: { requestedAt: "desc" },
    });
    if (active) return { ...active, reused: true, message: "Você já tem um pedido válido. Baixe seus dados até a data indicada." };
    const request = await db.dataExportRequest.create({
      data: { userId: context.user.id, status: "READY", requestedAt: now, expiresAt: new Date(now.getTime() + sevenDays) },
    });
    await audit(db, context.user.id, request.id, "DATA_EXPORT_REQUESTED");
    return { ...request, reused: false, message: "Seus dados estão disponíveis para download por 7 dias." };
  });
};

export const getDataExportRequest = async (_args: unknown, context: any) => {
  requireAuth(context.user);
  const request = await context.entities.DataExportRequest.findFirst({
    where: { userId: context.user.id }, orderBy: { requestedAt: "desc" },
  });
  return request ? { ...request, status: request.expiresAt <= new Date() ? "EXPIRED" : request.status } : null;
};

export async function downloadDataExport(req: any, res: any, context: any) {
  requireAuth(context.user);
  const result = await prisma.$transaction(async (db: any) => {
    // Lock before checking expiry and updating counters.
    const rows = await db.$queryRaw`SELECT "id" FROM "DataExportRequest" WHERE "id" = ${String(req.params.id)} AND "userId" = ${context.user.id} FOR UPDATE`;
    if (!rows.length) throw new HttpError(404, "Pedido não encontrado.");
    const request = await db.dataExportRequest.findUnique({ where: { id: String(req.params.id) } });
    const now = new Date();
    if (request.expiresAt <= now || request.status === "EXPIRED") {
      await db.dataExportRequest.update({ where: { id: request.id }, data: { status: "EXPIRED" } });
      await audit(db, context.user.id, request.id, "DATA_EXPORT_EXPIRED");
      return null;
    }
    // Explicit projections prevent invitation credentials or future secret fields
    // from entering the payload. No related people are included.
    const [user, memberships, guardianProfile] = await Promise.all([
      db.user.findUnique({
        where: { id: context.user.id },
        select: { id: true, email: true, firstName: true, lastName: true, phone: true, locale: true, createdAt: true },
      }),
      db.membership.findMany({
        where: { userId: context.user.id },
        select: { id: true, userId: true, parishId: true, communityId: true, role: true, status: true, createdAt: true, updatedAt: true, parish: { select: { name: true } } },
      }),
      db.guardianProfile.findUnique({
        where: { userId: context.user.id },
        select: { id: true, userId: true, email: true, firstName: true, lastName: true, householdId: true, phone: true, relationship: true, createdAt: true, updatedAt: true },
      }),
    ]);
    const payload = JSON.stringify({ exportedAt: now.toISOString(), user, memberships, guardianProfile });
    await db.dataExportRequest.update({
      where: { id: request.id },
      data: { status: "DOWNLOADED", deliveredAt: request.deliveredAt ?? now, lastDownloadedAt: now, downloadCount: { increment: 1 } },
    });
    await audit(db, context.user.id, request.id, "DATA_EXPORT_DOWNLOADED");
    return payload;
  });
  res.setHeader("Cache-Control", "no-store");
  if (result === null) return res.status(410).json({ error: "Pedido expirado. Solicite uma nova exportação." });
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="meus-dados.json"');
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.send(result);
}
