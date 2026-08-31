import type { Request, Response } from "express";
import { assertCanAccessContent } from "../auth/contentAccess";
import { readContentSourceFile } from "../storage/contentSourceStorage";

function contentDisposition(fileName: string): string {
  const fallback =
    fileName.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 180) || "documento";
  const ascii = fallback.replace(/["\r\n]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(
    fileName,
  )}`;
}

export async function serveContentSource(
  req: Request,
  res: Response,
  context: any,
) {
  try {
    if (!context.user) {
      return res.status(401).json({ error: "Autenticação necessária." });
    }

    const contentId = String(req.params.contentId || req.params.id || "");
    if (!contentId) {
      return res.status(400).json({ error: "Parâmetros inválidos." });
    }

    const item = await context.entities.ContentItem.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        parishId: true,
        createdById: true,
        sourceFileKey: true,
        sourceFileName: true,
        sourceFileMimeType: true,
      },
    });

    if (!item) {
      return res.status(404).json({ error: "Conteúdo não encontrado." });
    }

    await assertCanAccessContent(context, item);

    if (!item.sourceFileKey) {
      return res
        .status(404)
        .json({ error: "Ficheiro original não encontrado." });
    }

    const stored = await readContentSourceFile(item.sourceFileKey);
    if (!stored) {
      return res
        .status(404)
        .json({ error: "Ficheiro original não encontrado." });
    }

    res.setHeader(
      "Content-Type",
      stored.contentType ||
        item.sourceFileMimeType ||
        "application/octet-stream",
    );
    res.setHeader(
      "Content-Disposition",
      contentDisposition(item.sourceFileName || "documento"),
    );
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.send(stored.buffer);
  } catch (error: any) {
    const status = error?.statusCode || error?.status || 500;
    return res
      .status(status)
      .json({ error: error?.message || "Erro interno." });
  }
}
