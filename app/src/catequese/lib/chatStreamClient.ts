/**
 * Client-side helpers for POST /api/chat-stream (SSE).
 * Kept free of React so unit tests can assert infrastructure failure modes.
 */

export type ChatStreamValidationResult =
  | { ok: true }
  | { ok: false; kind: "http" | "html" | "json" | "content_type"; message: string };

const INFRA_HTML =
  "INFRA: a API de chat devolveu HTML em vez de um stream SSE. Verifique o proxy /api/* no reverse proxy (Caddy).";
const INFRA_JSON =
  "INFRA: a API de chat devolveu JSON com status 200 em vez de text/event-stream.";
const INFRA_CONTENT_TYPE =
  "INFRA: Content-Type inesperado na API de chat (esperado text/event-stream).";

/**
 * Validate that a successful fetch response is a real SSE stream, not SPA HTML
 * or an unexpected JSON body (typical when the reverse proxy falls back to index.html).
 */
export function validateChatStreamResponse(
  response: Pick<Response, "ok" | "status" | "headers">,
  bodyPreview?: string,
): ChatStreamValidationResult {
  const contentType = (response.headers.get("content-type") || "").toLowerCase();

  if (!response.ok) {
    return {
      ok: false,
      kind: "http",
      message: `HTTP ${response.status}`,
    };
  }

  // SPA fallback often returns 200 text/html for unknown routes.
  if (
    contentType.includes("text/html") ||
    looksLikeHtml(bodyPreview)
  ) {
    return { ok: false, kind: "html", message: INFRA_HTML };
  }

  if (contentType.includes("application/json")) {
    return { ok: false, kind: "json", message: INFRA_JSON };
  }

  if (!contentType.includes("text/event-stream")) {
    return {
      ok: false,
      kind: "content_type",
      message: `${INFRA_CONTENT_TYPE} Recebido: ${contentType || "(vazio)"}.`,
    };
  }

  return { ok: true };
}

export function looksLikeHtml(sample?: string): boolean {
  if (!sample) return false;
  const head = sample.trimStart().slice(0, 200).toLowerCase();
  return (
    head.startsWith("<!doctype html") ||
    head.startsWith("<html") ||
    head.includes("<head>") ||
    head.includes("<!doctype")
  );
}

export function isInfrastructureChatError(message: string | undefined): boolean {
  return Boolean(message && message.startsWith("INFRA:"));
}
