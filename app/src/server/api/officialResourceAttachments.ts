import type { Request, Response, NextFunction } from "express";
import type { MiddlewareConfigFn } from "wasp/server";
import { singleDocumentUpload } from "./multipart";
import {
  storeDocumentFile,
  readDocumentFile,
} from "../storage/documentStorage";
import {
  MAX_FILE_SIZE_BYTES,
  OFFICIAL_ATTACHMENT_MIME_TYPES,
  validateOfficialAttachmentSignature,
} from "../storage/uploadValidation";
import {
  actorCanViewOfficialResource,
  assertCanManageOwned,
  resolveActorForResource,
  resolveResourceActor,
} from "../operations/resourceScope";

function runMulter(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    singleDocumentUpload(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function officialResourceKeyPrefix(resource: {
  id: string;
  dioceseId?: string | null;
  parishId?: string | null;
}) {
  const owner = resource.dioceseId || resource.parishId || "general";
  return `official/${owner}/${resource.id}`;
}

export async function uploadOfficialResourceAttachment(
  req: Request,
  res: Response,
  context: any,
) {
  try {
    if (!context.user) {
      return res.status(401).json({ error: "Autenticação necessária." });
    }

    await runMulter(req, res);

    const file = req.file;
    const resourceId = String(req.params.id || req.body?.resourceId || "");
    const workspaceId = String(req.body?.workspaceId || "").trim() || undefined;

    if (!resourceId) {
      return res.status(400).json({ error: "resourceId é obrigatório." });
    }
    if (!file) {
      return res.status(400).json({ error: "Arquivo obrigatório." });
    }
    if (
      !OFFICIAL_ATTACHMENT_MIME_TYPES.includes(
        file.mimetype as (typeof OFFICIAL_ATTACHMENT_MIME_TYPES)[number],
      )
    ) {
      return res.status(400).json({
        error: "Use PDF, DOC, DOCX, ODT, XLSX, JPG, PNG ou WebP.",
      });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return res
        .status(400)
        .json({ error: "Arquivo muito grande. Máximo: 10 MB." });
    }
    if (!validateOfficialAttachmentSignature(file.buffer, file.mimetype)) {
      return res
        .status(400)
        .json({
          error: "Arquivo inválido ou o tipo não corresponde ao conteúdo.",
        });
    }

    const resource = await context.entities.OfficialResource.findUnique({
      where: { id: resourceId },
    });
    if (!resource) {
      return res.status(404).json({ error: "Recurso não encontrado." });
    }

    const actor = await resolveActorForResource(context, resource, workspaceId);
    assertCanManageOwned(actor, resource);

    const s3Key = await storeDocumentFile({
      buffer: file.buffer,
      mimeType: file.mimetype,
      parishId: resource.parishId || actor.parishId,
      keyPrefix: officialResourceKeyPrefix(resource),
    });

    const attachment = await context.entities.OfficialResourceAttachment.create(
      {
        data: {
          resourceId: resource.id,
          name: file.originalname || "anexo",
          mimeType: file.mimetype,
          s3Key,
          sizeBytes: file.size,
          uploadedById: context.user.id,
        },
      },
    );

    return res.json({
      success: true,
      attachment: {
        id: attachment.id,
        name: attachment.name,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        createdAt: attachment.createdAt,
      },
    });
  } catch (error: any) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    if (error?.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "Arquivo muito grande. Máximo: 10 MB." });
    }
    return res.status(500).json({ error: error?.message || "Erro interno." });
  }
}

export async function serveOfficialResourceAttachment(
  req: Request,
  res: Response,
  context: any,
) {
  try {
    if (!context.user) {
      return res.status(401).json({ error: "Autenticação necessária." });
    }

    const attachmentId = String(req.params.id || "");
    const workspaceId = String(req.query.workspaceId || "").trim() || undefined;
    if (!attachmentId) {
      return res.status(400).json({ error: "id é obrigatório." });
    }

    const attachment =
      await context.entities.OfficialResourceAttachment.findUnique({
        where: { id: attachmentId },
        include: { resource: true },
      });
    if (!attachment) {
      return res.status(404).json({ error: "Anexo não encontrado." });
    }

    const actor = await resolveResourceActor(context, workspaceId);
    if (!actorCanViewOfficialResource(actor, attachment.resource)) {
      return res
        .status(403)
        .json({ error: "Sem permissão para baixar este anexo." });
    }

    const stored = await readDocumentFile(attachment.s3Key);
    if (!stored) {
      return res
        .status(404)
        .json({ error: "Arquivo não encontrado no armazenamento." });
    }

    res.setHeader(
      "Content-Type",
      attachment.mimeType || stored.contentType || "application/octet-stream",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(attachment.name)}"`,
    );
    return res.send(stored.buffer);
  } catch (error: any) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: error?.message || "Erro interno." });
  }
}

export const officialResourceAttachmentMiddleware: MiddlewareConfigFn = (
  middlewareConfig,
) => {
  middlewareConfig.set("noop", ((
    _req: Request,
    _res: Response,
    next: NextFunction,
  ) => next()) as any);
  return middlewareConfig;
};
