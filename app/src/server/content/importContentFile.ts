import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import {
  ContentImportError,
  CONTENT_IMPORT_MAX_BYTES,
  resolveImportKind,
  titleFromFileName,
  type ContentImportKind,
} from "../../shared/contentImport";
import {
  contentDocumentToPlainText,
  htmlToContentDocument,
  markdownToContentDocument,
  plainTextToContentDocument,
  type ContentDocument,
} from "../../shared/contentDocument";

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46];
const ZIP_SIGNATURE = [0x50, 0x4b];

export type ImportedContentFile = {
  title: string;
  kind: ContentImportKind;
  document: ContentDocument;
  plainText: string;
};

function hasPrefix(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

function isLikelyUtf8Text(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  let nulls = 0;
  for (const byte of sample) {
    if (byte === 0) nulls += 1;
    if (nulls > 1) return false;
  }
  return true;
}

export function validateImportBuffer(
  buffer: Buffer,
  kind: ContentImportKind,
): void {
  if (buffer.length === 0) {
    throw new ContentImportError("EMPTY_TEXT", "O ficheiro está vazio.");
  }
  if (buffer.length > CONTENT_IMPORT_MAX_BYTES) {
    throw new ContentImportError(
      "TOO_LARGE",
      "Ficheiro demasiado grande. Máximo: 10 MB.",
    );
  }

  if (kind === "pdf" && !hasPrefix(buffer, PDF_SIGNATURE)) {
    throw new ContentImportError("INVALID_FILE", "PDF inválido.");
  }
  if (kind === "docx" && !hasPrefix(buffer, ZIP_SIGNATURE)) {
    throw new ContentImportError("INVALID_FILE", "Documento Word inválido.");
  }
  if ((kind === "txt" || kind === "md") && !isLikelyUtf8Text(buffer)) {
    throw new ContentImportError("INVALID_FILE", "Ficheiro de texto inválido.");
  }
}

function bufferToUtf8(buffer: Buffer): string {
  return buffer.toString("utf8").replace(/^\uFEFF/, "");
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return typeof text === "string" ? text : text.join("\n\n");
}

async function extractDocxHtml(buffer: Buffer): Promise<string> {
  type ConvertToHtml = (input: {
    buffer: Buffer;
  }) => Promise<{ value: string }>;
  const convert: ConvertToHtml | undefined =
    typeof (mammoth as { convertToHtml?: ConvertToHtml }).convertToHtml ===
    "function"
      ? (mammoth as { convertToHtml: ConvertToHtml }).convertToHtml.bind(
          mammoth,
        )
      : (mammoth as { default?: { convertToHtml?: ConvertToHtml } }).default
          ?.convertToHtml;
  if (typeof convert !== "function") {
    throw new ContentImportError(
      "PARSE_FAILED",
      "Não foi possível ler o documento Word.",
    );
  }
  const result = await convert({ buffer });
  return result.value || "";
}

export async function extractImportedDocument(params: {
  buffer: Buffer;
  fileName: string;
  mimeType?: string | null;
}): Promise<ImportedContentFile> {
  const kind = resolveImportKind(params.fileName, params.mimeType);
  if (!kind) {
    throw new ContentImportError(
      "INVALID_TYPE",
      "Use PDF, Word (.docx), TXT ou Markdown.",
    );
  }

  validateImportBuffer(params.buffer, kind);

  let document: ContentDocument;
  try {
    if (kind === "pdf") {
      document = plainTextToContentDocument(
        await extractPdfText(params.buffer),
      );
    } else if (kind === "docx") {
      document = htmlToContentDocument(await extractDocxHtml(params.buffer));
    } else if (kind === "md") {
      document = markdownToContentDocument(bufferToUtf8(params.buffer));
    } else {
      document = plainTextToContentDocument(bufferToUtf8(params.buffer));
    }
  } catch (error) {
    if (error instanceof ContentImportError) throw error;
    throw new ContentImportError(
      "PARSE_FAILED",
      "Não foi possível ler o ficheiro.",
    );
  }

  const plainText = contentDocumentToPlainText(document);
  if (!plainText) {
    throw new ContentImportError(
      "EMPTY_TEXT",
      "Não foi possível extrair texto. Se for um PDF digitalizado, exporte-o com texto selecionável.",
    );
  }

  return {
    title: titleFromFileName(params.fileName),
    kind,
    document,
    plainText,
  };
}
