import { Upload } from 'tus-js-client';
import type { TokenProvider } from '../api/client';
import type { SocialVideoUploadTicket } from '../api/types';
import { MAX_SOCIAL_VIDEO_BYTES } from './constants';

export type LocalMediaFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number | null;
};

export type SocialUploadAuth = {
  getBaseUrl: () => string;
  getToken: TokenProvider;
};

async function authHeaders(getToken: TokenProvider) {
  const token = await Promise.resolve(getToken());
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function uploadSocialImageFromUri(
  auth: SocialUploadAuth,
  file: LocalMediaFile,
): Promise<{ mediaId: string; url: string }> {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);

  const baseUrl = auth.getBaseUrl().replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/social/images`, {
    method: 'POST',
    headers: await authHeaders(auth.getToken),
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'Falha ao enviar imagem.');
  }
  if (!payload?.mediaId || !payload?.url) {
    throw new Error('Resposta de upload inválida.');
  }
  return { mediaId: payload.mediaId as string, url: payload.url as string };
}

function isStreamTicket(
  ticket: SocialVideoUploadTicket,
): ticket is Extract<SocialVideoUploadTicket, { transport: 'stream' }> {
  return ticket.transport === 'stream';
}

export function uploadSocialVideoFromUri(
  auth: SocialUploadAuth,
  file: LocalMediaFile,
  ticket: SocialVideoUploadTicket,
  handlers: {
    onProgress?: (percent: number) => void;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  } = {},
): { abort: () => void } {
  if (file.size && file.size > MAX_SOCIAL_VIDEO_BYTES) {
    handlers.onError?.(new Error('Vídeo demasiado grande. Máximo: 60 MB.'));
    return { abort: () => undefined };
  }

  if (!isStreamTicket(ticket)) {
    return uploadSocialVideoViaServer(auth, file, ticket.mediaId, handlers);
  }

  let aborted = false;
  let upload: Upload | null = null;

  void (async () => {
    try {
      const blob = await fetch(file.uri).then((res) => res.blob());
      if (aborted) return;

      upload = new Upload(blob, {
        endpoint: ticket.tusEndpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          AuthorizationSignature: ticket.authorizationSignature,
          AuthorizationExpire: String(ticket.authorizationExpire),
          VideoId: ticket.videoId,
          LibraryId: ticket.libraryId,
        },
        metadata: {
          filetype: file.mimeType,
          title: file.name.slice(0, 120),
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          if (!handlers.onProgress || !bytesTotal) return;
          handlers.onProgress(Math.round((bytesUploaded / bytesTotal) * 100));
        },
        onSuccess: () => handlers.onSuccess?.(),
        onError: (error) => handlers.onError?.(error as Error),
      });

      upload.start();
    } catch (error) {
      handlers.onError?.(error instanceof Error ? error : new Error('Falha ao enviar vídeo.'));
    }
  })();

  return {
    abort: () => {
      aborted = true;
      void upload?.abort(true);
    },
  };
}

function uploadSocialVideoViaServer(
  auth: SocialUploadAuth,
  file: LocalMediaFile,
  mediaId: string,
  handlers: {
    onProgress?: (percent: number) => void;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  },
): { abort: () => void } {
  const xhr = new XMLHttpRequest();
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);
  form.append('mediaId', mediaId);

  xhr.upload.onprogress = (event) => {
    if (!handlers.onProgress || !event.lengthComputable) return;
    handlers.onProgress(Math.round((event.loaded / event.total) * 100));
  };

  xhr.onload = () => {
    let payload: { error?: string; mediaId?: string } = {};
    try {
      payload = JSON.parse(xhr.responseText || '{}');
    } catch {
      handlers.onError?.(new Error('Falha ao enviar vídeo.'));
      return;
    }
    if (xhr.status >= 200 && xhr.status < 300 && payload.mediaId) {
      handlers.onSuccess?.();
      return;
    }
    handlers.onError?.(new Error(payload.error || 'Falha ao enviar vídeo.'));
  };

  xhr.onerror = () => handlers.onError?.(new Error('Falha ao enviar vídeo.'));
  xhr.onabort = () => handlers.onError?.(new Error('Envio cancelado.'));

  const baseUrl = auth.getBaseUrl().replace(/\/$/, '');
  xhr.open('POST', `${baseUrl}/api/social/videos`);

  void authHeaders(auth.getToken).then((headers) => {
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }
    xhr.send(form);
  });

  return { abort: () => xhr.abort() };
}
