export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const VALID_DOCUMENT_TYPES = [
  'BAPTISM_CERTIFICATE',
  'BIRTH_CERTIFICATE',
  'CONSENT_FORM',
  'MARRIAGE_CERTIFICATE',
  'PASTORAL_LETTER',
  'OTHER',
] as const;

const FILE_SIGNATURES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
};

/**
 * Container formats whose magic bytes sit at a fixed offset instead of byte 0.
 * MP4/MOV use an ISO-BMFF box: 4 size bytes, then the `ftyp` marker.
 */
const OFFSET_SIGNATURES: Record<string, { offset: number; bytes: number[] }> = {
  // 'ftyp'
  'video/mp4': { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  'video/quicktime': { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  // WebM/Matroska EBML header
  'video/webm': { offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] },
};

export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

export function validateFileSignature(buffer: Buffer, declaredMimeType: string): boolean {
  const signature = FILE_SIGNATURES[declaredMimeType];
  if (signature) {
    if (buffer.length < signature.length) return false;
    return signature.every((byte, i) => buffer[i] === byte);
  }

  const offsetSignature = OFFSET_SIGNATURES[declaredMimeType];
  if (offsetSignature) {
    const { offset, bytes } = offsetSignature;
    if (buffer.length < offset + bytes.length) return false;
    return bytes.every((byte, i) => buffer[offset + i] === byte);
  }

  return false;
}

export const TYPE_LABELS: Record<string, string> = {
  BAPTISM_CERTIFICATE: 'Certidão de Batismo',
  BIRTH_CERTIFICATE: 'Certidão de Nascimento',
  CONSENT_FORM: 'Termo de Consentimento',
  MARRIAGE_CERTIFICATE: 'Certidão de Matrimônio',
  PASTORAL_LETTER: 'Carta Pastoral',
  OTHER: 'Documento',
};
