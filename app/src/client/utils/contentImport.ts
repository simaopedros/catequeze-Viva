import {
  CONTENT_IMPORT_ACCEPT,
  CONTENT_IMPORT_MAX_BYTES,
  type ContentImportErrorCode,
} from "../../shared/contentImport";
import { getServerUrl, getWaspAuthHeaders } from "./documentUpload";

export { CONTENT_IMPORT_ACCEPT, CONTENT_IMPORT_MAX_BYTES };

export type ImportContentResult = {
  id: string;
};

export async function importContentFile(
  file: File,
): Promise<ImportContentResult> {
  if (file.size > CONTENT_IMPORT_MAX_BYTES) {
    const error = new Error("TOO_LARGE");
    (error as Error & { code: ContentImportErrorCode }).code = "TOO_LARGE";
    throw error;
  }

  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${getServerUrl()}/api/content-library/import`, {
    method: "POST",
    body: form,
    credentials: "include",
    headers: getWaspAuthHeaders(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error || "Falha ao importar o ficheiro.");
    if (payload?.code) {
      (error as Error & { code: string }).code = payload.code;
    }
    throw error;
  }
  if (!payload?.id) {
    throw new Error("Resposta de importação inválida.");
  }
  return { id: payload.id as string };
}

function fileNameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1]);
    } catch {
      return utf[1];
    }
  }
  const ascii = /filename="([^"]+)"/i.exec(header);
  return ascii?.[1] || null;
}

export async function downloadContentSourceFile(
  contentId: string,
): Promise<{ blob: Blob; fileName: string }> {
  const response = await fetch(
    `${getServerUrl()}/api/content-library/${contentId}/source`,
    {
      credentials: "include",
      headers: getWaspAuthHeaders(),
    },
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload?.error || "Não foi possível descarregar o original.",
    );
  }
  const blob = await response.blob();
  const fileName =
    fileNameFromDisposition(response.headers.get("content-disposition")) ||
    "documento";
  return { blob, fileName };
}

export function triggerBrowserDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
