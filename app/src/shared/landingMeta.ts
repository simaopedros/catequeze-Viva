/**
 * Landing SEO meta — shared by client SPA and server HTML injection.
 * Source of truth for title/description/canonical/campaign of public landings.
 */

export type LandingCampaign = "main" | "ia" | "attendance" | "system";

export type LandingRouteMeta = {
  title: string;
  description: string;
  canonicalPath: string;
  campaign: LandingCampaign;
  ogTitle?: string;
  ogDescription?: string;
  ogImagePath?: string;
};

export const SITE_ORIGIN =
  (typeof process !== "undefined" && process.env.REACT_APP_SITE_URL) ||
  (typeof process !== "undefined" && process.env.WASP_WEB_CLIENT_URL) ||
  "https://catechis.app";

export const LANDING_ROUTE_META: Record<string, LandingRouteMeta> = {
  "/": {
    title:
      "Catequese Viva — Teste grátis de 7 dias sem cartão | Sua turma, presença e encontros",
    description:
      "Organize sua turma, a chamada e o próximo encontro no mesmo lugar. Teste grátis de 7 dias, sem cartão e sem cobrança agora. Feito para o catequista.",
    canonicalPath: "/",
    campaign: "main",
  },
  "/ia": {
    title: "Assistência editorial para encontros de catequese | Catequese Viva",
    description:
      "Prepare roteiros de encontro com assistência editorial católica: objetivo, dinâmica, Bíblia e oração. Revise antes de usar. Trial de 7 dias.",
    canonicalPath: "/ia",
    campaign: "ia",
  },
  "/presenca": {
    title: "Chamada e presença de catequese no celular | Catequese Viva",
    description:
      "Faça a chamada pelo celular, acompanhe faltas e histórico da turma. Sem papel e sem planilha. Trial de 7 dias sem cartão.",
    canonicalPath: "/presenca",
    campaign: "attendance",
  },
  "/sistema": {
    title: "Sistema de gestão de catequese para paróquia | Catequese Viva",
    description:
      "Turmas, presença, famílias e relatórios no mesmo sistema. Para catequistas e coordenação. Trial de 7 dias sem cartão.",
    canonicalPath: "/sistema",
    campaign: "system",
  },
};

export function getLandingMeta(pathname: string): LandingRouteMeta | null {
  // Normalize trailing slash except root
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  return LANDING_ROUTE_META[path] ?? null;
}

export function canonicalUrlFor(meta: LandingRouteMeta): string {
  const origin = String(SITE_ORIGIN).replace(/\/$/, "");
  return meta.canonicalPath === "/"
    ? `${origin}/`
    : `${origin}${meta.canonicalPath}`;
}

/** Build <head> injection snippet (server / crawler-facing). */
export function buildLandingHeadSnippet(meta: LandingRouteMeta): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const ogTitle = escapeHtml(meta.ogTitle ?? meta.title);
  const ogDescription = escapeHtml(meta.ogDescription ?? meta.description);
  const url = escapeHtml(canonicalUrlFor(meta));
  const image = escapeHtml(
    `${String(SITE_ORIGIN).replace(/\/$/, "")}${meta.ogImagePath || "/public-banner.webp"}`,
  );

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${ogTitle}" />`,
    `<meta property="og:description" content="${ogDescription}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${ogTitle}" />`,
    `<meta name="twitter:description" content="${ogDescription}" />`,
    `<meta name="catequese:campaign" content="${escapeHtml(meta.campaign)}" />`,
  ].join("\n    ");
}

/**
 * Inject/replace title, description, canonical, OG into an HTML document string.
 */
export function injectLandingMetaIntoHtml(
  html: string,
  meta: LandingRouteMeta,
): string {
  let out = html;
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const ogTitle = escapeHtml(meta.ogTitle ?? meta.title);
  const ogDescription = escapeHtml(meta.ogDescription ?? meta.description);
  const url = escapeHtml(canonicalUrlFor(meta));
  const image = escapeHtml(
    `${String(SITE_ORIGIN).replace(/\/$/, "")}${meta.ogImagePath || "/public-banner.webp"}`,
  );

  if (/<title>[\s\S]*?<\/title>/i.test(out)) {
    out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  } else {
    out = out.replace(/<head([^>]*)>/i, `<head$1>\n    <title>${title}</title>`);
  }

  out = upsertMetaName(out, "description", description);
  out = upsertLinkCanonical(out, url);
  out = upsertMetaProperty(out, "og:title", ogTitle);
  out = upsertMetaProperty(out, "og:description", ogDescription);
  out = upsertMetaProperty(out, "og:url", url);
  out = upsertMetaProperty(out, "og:image", image);
  out = upsertMetaProperty(out, "og:type", "website");
  out = upsertMetaName(out, "twitter:title", ogTitle);
  out = upsertMetaName(out, "twitter:description", ogDescription);
  out = upsertMetaName(out, "catequese:campaign", meta.campaign);

  return out;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function upsertMetaName(html: string, name: string, content: string): string {
  const re = new RegExp(
    `<meta\\s+name=["']${name}["']\\s+content=["'][^"']*["']\\s*/?>`,
    "i",
  );
  const tag = `<meta name="${name}" content="${content}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}

function upsertMetaProperty(
  html: string,
  property: string,
  content: string,
): string {
  const re = new RegExp(
    `<meta\\s+property=["']${property.replace(":", "\\:")}["']\\s+content=["'][^"']*["']\\s*/?>`,
    "i",
  );
  const tag = `<meta property="${property}" content="${content}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}

function upsertLinkCanonical(html: string, href: string): string {
  const re = /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i;
  const tag = `<link rel="canonical" href="${href}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}
