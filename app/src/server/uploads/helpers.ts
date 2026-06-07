import crypto from 'node:crypto';
import path from 'path';

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export function extensionForMime(
  mimeType: string,
  allowed: string[] = ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
): string | null {
  const ext = MIME_TO_EXT[mimeType] || mimeType.split('/')[1]?.toLowerCase();
  if (!ext || !allowed.includes(ext)) return null;
  return ext === 'jpeg' ? 'jpg' : ext;
}

export function generateUploadFileName(
  mimeType: string,
  allowed?: string[],
): string {
  const ext = extensionForMime(mimeType, allowed);
  if (!ext) throw new Error('Tipo MIME inválido.');
  return `${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
}

/** Resolves a stored s3Key to an absolute path, rejecting path traversal. */
export function resolveUploadFilePath(s3Key: string): string | null {
  const safeName = path.basename(s3Key);
  if (!safeName || safeName !== s3Key || safeName.includes('..')) return null;

  const uploadsRoot = path.resolve(UPLOADS_DIR);
  const resolved = path.resolve(uploadsRoot, safeName);
  if (resolved !== uploadsRoot && !resolved.startsWith(`${uploadsRoot}${path.sep}`)) {
    return null;
  }
  return resolved;
}
