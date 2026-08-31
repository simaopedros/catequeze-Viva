export const CONTENT_IMPORT_MAX_BYTES = 10 * 1024 * 1024;

export const CONTENT_LIBRARY_STORAGE_PREFIX = "content-library";

export type ContentImportKind = "pdf" | "docx" | "txt" | "md";

export type ContentImportErrorCode =
  | "INVALID_TYPE"
  | "EMPTY_TEXT"
  | "TOO_LARGE"
  | "INVALID_FILE"
  | "STORAGE_NOT_CONFIGURED"
  | "PARSE_FAILED";

export const CONTENT_IMPORT_MIME_BY_KIND: Record<ContentImportKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
};

export const CONTENT_IMPORT_ACCEPT =
  ".pdf,.docx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/x-markdown";

export class ContentImportError extends Error {
  constructor(
    public readonly code: ContentImportErrorCode,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ContentImportError";
  }
}

export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "");
  const title = base.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  return title.slice(0, 200) || "Novo encontro";
}

export function resolveImportKind(
  fileName: string,
  mimeType?: string | null,
): ContentImportKind | null {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const mime = (mimeType || "").toLowerCase().trim();

  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (
    ext === "docx" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (
    ext === "md" ||
    ext === "markdown" ||
    mime === "text/markdown" ||
    mime === "text/x-markdown"
  ) {
    return "md";
  }
  if (ext === "txt" || mime === "text/plain") return "txt";
  return null;
}
