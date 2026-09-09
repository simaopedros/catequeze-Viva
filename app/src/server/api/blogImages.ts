import type { Request, Response, NextFunction } from "express";
import type { MiddlewareConfigFn } from "wasp/server";
import { singleDocumentUpload } from "./multipart";
import {
  storeDocumentFile,
  readDocumentFile,
} from "../storage/documentStorage";
import { validateFileSignature } from "../storage/uploadValidation";
import { createRateLimiter } from "../middleware/rateLimiter";
import {
  blogImageKeyPrefix,
  buildBlogImageUrl,
  isBlogImageKey,
} from "../../shared/blog";

const MAX_BLOG_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function runMulter(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    singleDocumentUpload(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function uploadBlogImage(
  req: Request,
  res: Response,
  context: any,
) {
  try {
    if (!context.user) {
      return res.status(401).json({ error: "Autenticação necessária." });
    }
    if (!context.user.isAdmin) {
      return res
        .status(403)
        .json({
          error: "Apenas administradores podem enviar imagens do blog.",
        });
    }

    await runMulter(req, res);

    const file = req.file;
    const postId = String(req.body?.postId || "");

    if (!postId) {
      return res.status(400).json({ error: "postId é obrigatório." });
    }
    if (!file) {
      return res.status(400).json({ error: "Ficheiro obrigatório." });
    }
    if (
      !ALLOWED_IMAGE_TYPES.includes(
        file.mimetype as (typeof ALLOWED_IMAGE_TYPES)[number],
      )
    ) {
      return res.status(400).json({ error: "Use JPG, PNG ou WebP." });
    }
    if (file.size > MAX_BLOG_IMAGE_SIZE_BYTES) {
      return res
        .status(400)
        .json({ error: "Imagem demasiado grande. Máximo: 5 MB." });
    }
    if (!validateFileSignature(file.buffer, file.mimetype)) {
      return res.status(400).json({ error: "Imagem inválida." });
    }

    const post = await context.entities.BlogPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      return res.status(404).json({ error: "Artigo não encontrado." });
    }

    const key = await storeDocumentFile({
      buffer: file.buffer,
      mimeType: file.mimetype,
      keyPrefix: blogImageKeyPrefix(post.id),
    });

    return res.json({
      success: true,
      key,
      url: buildBlogImageUrl(key),
    });
  } catch (error: any) {
    if (error?.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "Imagem demasiado grande. Máximo: 5 MB." });
    }
    return res.status(500).json({ error: error?.message || "Erro interno." });
  }
}

export async function serveBlogImage(
  req: Request,
  res: Response,
  _context: any,
) {
  try {
    const key = String(req.query?.key || "");
    if (!isBlogImageKey(key)) {
      return res.status(400).json({ error: "Chave inválida." });
    }

    const stored = await readDocumentFile(key);
    if (!stored) {
      return res.status(404).json({ error: "Imagem não encontrada." });
    }

    res.setHeader(
      "Content-Type",
      stored.contentType || "application/octet-stream",
    );
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.send(stored.buffer);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Erro interno." });
  }
}

export const blogImageUploadMiddleware: MiddlewareConfigFn = (
  middlewareConfig,
) => {
  middlewareConfig.set("noop", ((
    _req: Request,
    _res: Response,
    next: NextFunction,
  ) => next()) as any);
  return middlewareConfig;
};

export const blogImageServeMiddleware: MiddlewareConfigFn = (
  middlewareConfig,
) => {
  middlewareConfig.set(
    "blogImageServeRateLimit",
    createRateLimiter({ windowMs: 60 * 1000, max: 240 }) as any,
  );
  return middlewareConfig;
};
