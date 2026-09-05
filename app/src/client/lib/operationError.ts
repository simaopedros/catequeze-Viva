/** Status from Wasp HttpError, Axios, or the generic "status code NNN" message. */
export function httpStatusFromError(error: unknown): number | null {
  if (!error || typeof error !== "object") {
    return statusFromMessage(
      error instanceof Error ? error.message : String(error ?? ""),
    );
  }
  const record = error as {
    statusCode?: unknown;
    status?: unknown;
    message?: unknown;
    response?: { status?: unknown };
    data?: { message?: unknown };
  };
  const nested = record.statusCode ?? record.status ?? record.response?.status;
  if (typeof nested === "number" && Number.isFinite(nested)) return nested;
  const message = [record.message, record.data?.message]
    .filter((value) => typeof value === "string")
    .join(" ");
  return statusFromMessage(message);
}

function statusFromMessage(message: string): number | null {
  const match = /status code (\d{3})/i.exec(message);
  if (!match) return null;
  return Number(match[1]);
}

export function isTransientRequestError(error: unknown): boolean {
  const status = httpStatusFromError(error);
  if (status === 502 || status === 503 || status === 504) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /network error|econnreset|econnrefused|etimedout|socket hang up/i.test(
    message,
  );
}

export function isPlanLimitError(error: unknown): boolean {
  const record = error as {
    message?: unknown;
    data?: { message?: unknown };
  } | null;
  const message = [record?.message, record?.data?.message]
    .filter((value) => typeof value === "string")
    .join(" ");
  return /LIMIT:/i.test(message);
}

export async function withTransientRetry<T>(
  fn: () => Promise<T>,
  opts?: { attempts?: number; delayMs?: number },
): Promise<T> {
  const attempts = opts?.attempts ?? 3;
  const delayMs = opts?.delayMs ?? 700;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientRequestError(error) || attempt === attempts - 1) {
        throw error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, delayMs * (attempt + 1)),
      );
    }
  }
  throw lastError;
}
