import crypto from "node:crypto";
import {
  CONTENT_IMPORT_MIME_BY_KIND,
  CONTENT_LIBRARY_STORAGE_PREFIX,
  ContentImportError,
  type ContentImportKind,
} from "../../shared/contentImport";
import {
  bunnyDeleteObject,
  bunnyGetObject,
  bunnyPutObject,
  isBunnyStorageConfigured,
} from "./bunnyStorage";

export async function storeContentSourceFile(params: {
  buffer: Buffer;
  kind: ContentImportKind;
  parishId?: string | null;
}): Promise<string> {
  if (!isBunnyStorageConfigured()) {
    throw new ContentImportError(
      "STORAGE_NOT_CONFIGURED",
      "Armazenamento de ficheiros indisponível.",
      503,
    );
  }

  const fileName = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${
    params.kind
  }`;
  const prefix = params.parishId?.trim() || "general";
  const key = `${CONTENT_LIBRARY_STORAGE_PREFIX}/${prefix}/${fileName}`;
  await bunnyPutObject(
    key,
    params.buffer,
    CONTENT_IMPORT_MIME_BY_KIND[params.kind],
  );
  return key;
}

export async function readContentSourceFile(
  key: string,
): Promise<{ buffer: Buffer; contentType: string | null } | null> {
  if (!key.startsWith(`${CONTENT_LIBRARY_STORAGE_PREFIX}/`)) return null;
  if (!isBunnyStorageConfigured()) return null;
  try {
    return await bunnyGetObject(key);
  } catch {
    return null;
  }
}

export async function deleteContentSourceFile(key: string): Promise<void> {
  if (!key.startsWith(`${CONTENT_LIBRARY_STORAGE_PREFIX}/`)) return;
  if (!isBunnyStorageConfigured()) return;
  await bunnyDeleteObject(key);
}
