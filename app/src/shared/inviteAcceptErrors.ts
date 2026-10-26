/** UI kind for family/staff invite accept failures. */
export type InviteAcceptErrorKind =
  | "expired"
  | "wrong_email"
  | "already_used"
  | "not_found"
  | "generic";

function statusFromError(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    const msg = String(error ?? "");
    const m = msg.match(/status code (\d{3})/i);
    return m ? Number(m[1]) : undefined;
  }
  const record = error as {
    statusCode?: unknown;
    status?: unknown;
    response?: { status?: unknown };
    message?: unknown;
  };
  const nested = record.statusCode ?? record.status ?? record.response?.status;
  if (typeof nested === "number" && Number.isFinite(nested)) return nested;
  if (typeof nested === "string" && /^\d{3}$/.test(nested)) return Number(nested);
  const msg = String(record.message ?? "");
  const m = msg.match(/status code (\d{3})/i);
  return m ? Number(m[1]) : undefined;
}

/**
 * Map HTTP / Wasp invite errors to a stable UI kind so the portal can show
 * clear Portuguese next steps (expired, wrong account, already accepted…).
 */
export function inviteAcceptErrorKind(error: unknown): InviteAcceptErrorKind {
  const status = statusFromError(error);
  if (status === 410) return "expired";
  if (status === 404) return "not_found";
  if (status === 400) return "already_used";
  if (status === 403) return "wrong_email";

  const message = String(
    (error as { message?: unknown } | null | undefined)?.message ?? error ?? "",
  ).toLowerCase();
  if (message.includes("expirou") || message.includes("expired")) {
    return "expired";
  }
  if (
    message.includes("outro endereço") ||
    message.includes("não é para você") ||
    message.includes("not for you")
  ) {
    return "wrong_email";
  }
  if (
    message.includes("já foi processado") ||
    message.includes("already") ||
    message.includes("processado")
  ) {
    return "already_used";
  }
  if (
    message.includes("não encontrado") ||
    message.includes("not found") ||
    message.includes("inválido")
  ) {
    return "not_found";
  }
  return "generic";
}

/** i18n key suffix under `invite.*` for the error title. */
export function inviteErrorTitleKey(kind: InviteAcceptErrorKind): string {
  switch (kind) {
    case "expired":
      return "expired_title";
    case "wrong_email":
      return "wrong_email_title";
    case "already_used":
      return "already_used_title";
    case "not_found":
      return "not_found_title";
    default:
      return "generic_error_title";
  }
}

/** i18n key suffix under `invite.*` for the error description / next step. */
export function inviteErrorDescKey(kind: InviteAcceptErrorKind): string {
  switch (kind) {
    case "expired":
      return "expired_desc_accept";
    case "wrong_email":
      return "wrong_email_desc";
    case "already_used":
      return "already_used_desc";
    case "not_found":
      return "not_found_desc";
    default:
      return "generic_error_desc";
  }
}
