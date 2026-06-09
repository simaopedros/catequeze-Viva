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

function buildObjectKey(parishId: string | undefined, mimeType: string): string {
  const prefix = parishId || 'general';
  const fileName = generateUploadFileName(mimeType);
  return `${prefix}/${fileName}`;
}

export async function storeDocumentFile(params: {
  buffer: Buffer;
  mimeType: string;
  parishId?: string;
}): Promise<string> {
  const key = buildObjectKey(params.parishId, params.mimeType);

  if (isBunnyStorageConfigured()) {
    await bunnyPutObject(key, params.buffer, params.mimeType);
    return key;
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const fileName = path.basename(key);
  const filePath = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(filePath, params.buffer);
  return fileName;
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
