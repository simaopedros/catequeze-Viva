import * as fs from 'fs';
import path from 'path';
import {
  UPLOADS_DIR,
  generateUploadFileName,
  resolveUploadFilePath,
} from '../uploads/helpers';
import {
  bunnyDeleteObject,
  bunnyGetObject,
  bunnyPutObject,
  bunnyStorageHealthCheck,
  isBunnyStorageConfigured,
} from './bunnyStorage';

export type StoredFile = {
  buffer: Buffer;
  contentType: string;
};

function buildObjectKey(
  parishId: string | undefined,
  mimeType: string,
  keyPrefix?: string,
): string {
  const prefix = keyPrefix || parishId || 'general';
  const fileName = generateUploadFileName(mimeType);
  return `${prefix}/${fileName}`;
}

/** Namespaced prefix that binds a stored object to one content item. */
export function contentImageKeyPrefix(item: { id: string; parishId?: string | null }): string {
  return `content/${item.parishId || 'general'}/${item.id}`;
}

export async function storeDocumentFile(params: {
  buffer: Buffer;
  mimeType: string;
  parishId?: string;
  /** When set, the object is stored under this prefix instead of `<parishId>/` (Bunny and local). */
  keyPrefix?: string;
}): Promise<string> {
  const key = buildObjectKey(params.parishId, params.mimeType, params.keyPrefix);

  if (isBunnyStorageConfigured()) {
    await bunnyPutObject(key, params.buffer, params.mimeType);
    return key;
  }

  // Local storage: legacy callers keep flat file names; namespaced prefixes keep their folders.
  const localKey = params.keyPrefix ? key : path.basename(key);
  const filePath = resolveUploadFilePath(localKey);
  if (!filePath) throw new Error('Chave de armazenamento inválida.');

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, params.buffer);
  return localKey;
}

export async function readDocumentFile(key: string): Promise<StoredFile | null> {
  if (isBunnyStorageConfigured()) {
    try {
      const { buffer, contentType } = await bunnyGetObject(key);
      return {
        buffer,
        contentType: contentType || 'application/octet-stream',
      };
    } catch {
      return null;
    }
  }

  const filePath = resolveUploadFilePath(key);
  if (!filePath || !fs.existsSync(filePath)) return null;

  return {
    buffer: fs.readFileSync(filePath),
    contentType: 'application/octet-stream',
  };
}

export async function deleteDocumentFile(key: string): Promise<void> {
  if (isBunnyStorageConfigured()) {
    await bunnyDeleteObject(key);
    return;
  }

  const filePath = resolveUploadFilePath(key);
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export async function getDocumentStorageStatus(): Promise<{
  backend: 'bunny' | 'local';
  healthy: boolean;
}> {
  if (isBunnyStorageConfigured()) {
    return {
      backend: 'bunny',
      healthy: await bunnyStorageHealthCheck(),
    };
  }

  return {
    backend: 'local',
    healthy: fs.existsSync(UPLOADS_DIR) || true,
  };
}
