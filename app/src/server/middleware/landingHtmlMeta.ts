/**
 * Crawler-facing meta injection for marketing landings.
 *
 * When the server serves the SPA index.html (production), rewrite title /
 * description / OG / canonical per path using shared/landingMeta.
 *
 * Dev: Vite serves the client on :3000 — crawlers that hit the SPA still get
 * client-side meta after JS; this middleware helps production single-origin deploys.
 */
import type { Express, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import {
  getLandingMeta,
  injectLandingMetaIntoHtml,
} from "../../shared/landingMeta";
import { logger } from "../logger";

function resolveIndexHtmlPath(): string | null {
  const candidates = [
    // Wasp production build layouts (best-effort)
    path.resolve(process.cwd(), ".wasp/build/web-app/index.html"),
    path.resolve(process.cwd(), ".wasp/out/web-app/index.html"),
    path.resolve(process.cwd(), "dist/index.html"),
    path.resolve(process.cwd(), "public/index.html"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

let cachedIndex: { path: string; mtimeMs: number; html: string } | null = null;

function readIndexHtml(): string | null {
  const indexPath = resolveIndexHtmlPath();
  if (!indexPath) return null;
  try {
    const st = fs.statSync(indexPath);
    if (
      cachedIndex &&
      cachedIndex.path === indexPath &&
      cachedIndex.mtimeMs === st.mtimeMs
    ) {
      return cachedIndex.html;
    }
    const html = fs.readFileSync(indexPath, "utf8");
    cachedIndex = { path: indexPath, mtimeMs: st.mtimeMs, html };
    return html;
  } catch {
    return null;
  }
}

export function registerLandingHtmlMeta(app: Express): void {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    // Skip API / assets / operations
    if (
      req.path.startsWith("/operations") ||
      req.path.startsWith("/auth") ||
      req.path.startsWith("/api") ||
      req.path.startsWith("/mobile") ||
      req.path.includes(".")
    ) {
      return next();
    }

    const meta = getLandingMeta(req.path);
    if (!meta) return next();

    const accept = req.headers.accept || "";
    if (!String(accept).includes("text/html") && req.method === "GET") {
      // Some crawlers send minimal Accept — still inject for landing GETs without extension
      if (!accept || accept === "*/*") {
        /* continue */
      } else {
        return next();
      }
    }

    const indexHtml = readIndexHtml();
    if (!indexHtml) {
      // No built index in this environment (typical local `wasp start` split ports)
      return next();
    }

    try {
      const html = injectLandingMetaIntoHtml(indexHtml, meta);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=60");
      if (req.method === "HEAD") {
        res.status(200).end();
        return;
      }
      res.status(200).send(html);
    } catch (e) {
      logger.warn("[landingHtmlMeta] inject failed", { error: String(e) });
      next();
    }
  });

  logger.info("[setup] Landing HTML meta injection registered for marketing routes");
}
