import { getWaspAuthHeaders } from './documentUpload';

export async function uploadContentImage(file: File, contentId: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('contentId', contentId);

  // Wasp authenticates raw API routes via the `Authorization: Bearer <sessionId>`
  // header, not via cookies — otherwise `context.user` is empty and the upload
  // is rejected with 401.
  const response = await fetch('/api/content-images/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: getWaspAuthHeaders(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'Falha ao enviar imagem.');
  }

  if (!payload?.url) {
    throw new Error('Resposta de upload inválida.');
  }

  return payload.url as string;
}
