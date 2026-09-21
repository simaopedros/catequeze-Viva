import { Platform } from 'react-native';
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

/** RN file part for FormData — must not be cast to Blob (breaks Expo fetch). */
export function toReactNativeFormFile(file: LocalMediaFile) {
  return {
    uri: normalizeUploadUri(file.uri),
    name: file.name,
    type: file.mimeType || 'application/octet-stream',
  };
}

/**
 * Image picker URIs must be passed as-is to XHR multipart; Expo's fetch FormData
 * encoder only supports strings/Blobs and throws "Unsupported FormDataPart implementation".
 */
export function normalizeUploadUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) return trimmed;
  if (
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('ph://') ||
    trimmed.startsWith('assets-library://')
  ) {
    return trimmed;
  }
  if (Platform.OS === 'android' && trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }
  return trimmed;
}

async function authHeaders(getToken: TokenProvider) {
  const token = await Promise.resolve(getToken());
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function postMultipart(
  auth: SocialUploadAuth,
  path: string,
  buildForm: () => FormData,
  handlers?: { onProgress?: (percent: number) => void },
): Promise<{ ok: boolean; status: number; payload: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const baseUrl = auth.getBaseUrl().replace(/\/$/, '');
    const url = `${baseUrl}${path}`;

    xhr.upload.onprogress = (event) => {
      if (!handlers?.onProgress || !event.lengthComputable) return;
      handlers.onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(xhr.responseText || '{}') as Record<string, unknown>;
      } catch {
        payload = { message: xhr.responseText };
      }
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        payload,
      });
    };

    xhr.onerror = () => reject(new Error('Falha na ligação ao servidor.'));
    xhr.onabort = () => reject(new Error('Envio cancelado.'));

    xhr.open('POST', url);

    void authHeaders(auth.getToken).then((headers) => {
      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value);
      }
      xhr.send(buildForm());
    });
  });
}

export async function uploadSocialImageFromUri(
  auth: SocialUploadAuth,
  file: LocalMediaFile,
  handlers?: { onProgress?: (percent: number) => void },
): Promise<{ mediaId: string; url: string }> {
  const result = await postMultipart(
    auth,
    '/api/social/images',
    () => {
      const formData = new FormData();
      formData.append('file', toReactNativeFormFile(file) as unknown as Blob);
      return formData;
    },
    handlers,
  );

  if (!result.ok) {
    const message =
      typeof result.payload.error === 'string'
        ? result.payload.error
        : typeof result.payload.message === 'string'
          ? result.payload.message
          : 'Falha ao enviar imagem.';
    throw new Error(message);
  }

  const mediaId = result.payload.mediaId;
  const url = result.payload.url;
  if (typeof mediaId !== 'string' || typeof url !== 'string') {
    throw new Error('Resposta de upload inválida.');
  }
  return { mediaId, url };
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
      const blob = await fetch(normalizeUploadUri(file.uri)).then((res) => res.blob());
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
  form.append('file', toReactNativeFormFile(file) as unknown as Blob);
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
