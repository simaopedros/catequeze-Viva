import { Upload } from 'tus-js-client';
import { getWaspAuthHeaders } from './documentUpload';

export interface UploadedSocialImage {
  mediaId: string;
  url: string;
}

export async function uploadSocialImage(
  file: File,
  altText?: string,
): Promise<UploadedSocialImage> {
  const formData = new FormData();
  formData.append('file', file);
  if (altText) formData.append('altText', altText);

  // Wasp authenticates raw API routes via the `Authorization: Bearer <sessionId>`
  // header (stored in localStorage), not via cookies. Sending only
  // `credentials: 'include'` leaves `context.user` empty and the endpoint
  // responds 401 "Autenticação necessária.".
  const response = await fetch('/api/social/images', {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: getWaspAuthHeaders(),
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

export interface SocialVideoUploadTicket {
  mediaId: string;
  libraryId: string;
  videoId: string;
  tusEndpoint: string;
  authorizationSignature: string;
  authorizationExpire: number;
  embedUrl: string;
}

/**
 * Uploads the file straight to Bunny Stream with the short-lived TUS
 * credentials issued by createSocialVideoUpload — the bytes never reach our
 * server. Bunny then notifies the app over the webhook when transcoding ends.
 */
export function uploadSocialVideo(
  file: File,
  ticket: SocialVideoUploadTicket,
  handlers: {
    onProgress?: (percent: number) => void;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  } = {},
): { abort: () => void } {
  const upload = new Upload(file, {
    endpoint: ticket.tusEndpoint,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    headers: {
      AuthorizationSignature: ticket.authorizationSignature,
      AuthorizationExpire: String(ticket.authorizationExpire),
      VideoId: ticket.videoId,
      LibraryId: ticket.libraryId,
    },
    metadata: {
      filetype: file.type,
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

  return {
    abort: () => {
      void upload.abort(true);
    },
  };
}

/** Reads the duration of a local video file so plan limits fail fast. */
export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? Math.round(video.duration) : null;
      cleanup();
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };

    video.src = url;
  });
}
