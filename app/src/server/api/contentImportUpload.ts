import type { Request, Response, NextFunction } from "express";
import type { MiddlewareConfigFn } from "wasp/server";
import multer from "multer";
import { canCreateContent, getUserRoleAndParish } from "../auth/contentAccess";
import { extractImportedDocument } from "../content/importContentFile";
import { resolveUserLocale } from "../i18n/serverLocale";
import { logger } from "../logger";
import { CONTENT_DOCUMENT_VERSION } from "../../shared/contentDocument";
import {
  CONTENT_IMPORT_MAX_BYTES,
  CONTENT_IMPORT_MIME_BY_KIND,
  ContentImportError,
} from "../../shared/contentImport";
import {
  deleteContentSourceFile,
  storeContentSourceFile,
} from "../storage/contentSourceStorage";

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: CONTENT_IMPORT_MAX_BYTES, files: 1 },
}).single("file");

function runMulter(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    importUpload(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function sendImportError(res: Response, error: unknown) {
  if (error instanceof ContentImportError) {
    return res.status(error.status).json({
      error: error.message,
      code: error.code,
    });
  }
  if ((error as { code?: string })?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "Ficheiro demasiado grande. Máximo: 10 MB.",
      code: "TOO_LARGE",
    });
  }
  logger.error("content import failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  return res.status(500).json({ error: "Erro interno." });
}

export async function importContentDocument(
  req: Request,
  res: Response,
  context: any,
) {
  try {
    if (!context.user) {
      return res.status(401).json({ error: "Autenticação necessária." });
    }

    const { role, parishId } = await getUserRoleAndParish(context);
    if (!canCreateContent(role)) {
      return res
        .status(403)
        .json({ error: "Sem permissão para criar conteúdo." });
    }

    await runMulter(req, res);

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        error: "Ficheiro obrigatório.",
        code: "INVALID_FILE",
      });
    }

    const imported = await extractImportedDocument({
      buffer: file.buffer,
      fileName: file.originalname || "documento",
      mimeType: file.mimetype,
    });

    const sourceFileKey = await storeContentSourceFile({
      buffer: file.buffer,
      kind: imported.kind,
      parishId,
    });

    try {
      const item = await context.entities.ContentItem.create({
        data: {
          title: imported.title,
          theme: null,
          mainContent: imported.plainText.slice(0, 8000),
          documentJson: JSON.stringify(imported.document),
          documentVersion: CONTENT_DOCUMENT_VERSION,
          sourceFileKey,
          sourceFileName: file.originalname || imported.title,
          sourceFileMimeType: CONTENT_IMPORT_MIME_BY_KIND[imported.kind],
          status: "DRAFT",
          locale: resolveUserLocale(context.user),
          createdById: context.user.id,
          parishId: parishId || null,
          estimatedTime: 60,
        },
      });

      return res.json({ id: item.id });
    } catch (error) {
      await deleteContentSourceFile(sourceFileKey).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return sendImportError(res, error);
  }
}

export const importContentMiddleware: MiddlewareConfigFn = (
  middlewareConfig,
) => {
  middlewareConfig.set("noop", ((
    _req: Request,
    _res: Response,
    next: NextFunction,
  ) => next()) as any);
  return middlewareConfig;
};
