import { Upload } from "tus-js-client";
import { getWaspAuthHeaders } from "./documentUpload";

export interface UploadedSocialImage {
  mediaId: string;
  url: string;
}

export async function uploadSocialImage(
  file: File,
  altText?: string,
): Promise<UploadedSocialImage> {
  const formData = new FormData();
  formData.append("file", file);
  if (altText) formData.append("altText", altText);

  // Wasp authenticates raw API routes via the `Authorization: Bearer <sessionId>`
  // header (stored in localStorage), not via cookies. Sending only
  // `credentials: 'include'` leaves `context.user` empty and the endpoint
  // responds 401 "Autenticação necessária.".
  const response = await fetch("/api/social/images", {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: getWaspAuthHeaders(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Falha ao enviar imagem.");
  }
  if (!payload?.mediaId || !payload?.url) {
    throw new Error("Resposta de upload inválida.");
  }

  return { mediaId: payload.mediaId as string, url: payload.url as string };
}

export type SocialVideoUploadTicket =
  | {
      transport: "stream";
      mediaId: string;
      libraryId: string;
      videoId: string;
      tusEndpoint: string;
      authorizationSignature: string;
      authorizationExpire: number;
      embedUrl: string;
    }
  | {
      transport: "server";
      mediaId: string;
    };

function isStreamTicket(
  ticket: SocialVideoUploadTicket | Record<string, unknown>,
): ticket is Extract<SocialVideoUploadTicket, { transport: "stream" }> {
  const candidate = ticket as Record<string, unknown>;
  return Boolean(
    candidate?.tusEndpoint &&
      ticket &&
      candidate.videoId &&
      candidate.libraryId,
  );
}

/**
 * Uploads a Comunidade video.
 *
 * - `transport: 'stream'` — TUS straight to Bunny Stream (bytes never reach our server).
 * - `transport: 'server'` — multipart to `/api/social/videos` (homolog / local Storage).
 */
export function uploadSocialVideo(
  file: File,
  ticket: SocialVideoUploadTicket,
  handlers: {
    onProgress?: (percent: number) => void;
    onSuccess?: (result?: { url?: string }) => void;
    onError?: (error: Error) => void;
  } = {},
): { abort: () => void } {
  if (!isStreamTicket(ticket)) {
    return uploadSocialVideoViaServer(file, ticket.mediaId, handlers);
  }

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

function uploadSocialVideoViaServer(
  file: File,
  mediaId: string,
  handlers: {
    onProgress?: (percent: number) => void;
    onSuccess?: (result?: { url?: string }) => void;
    onError?: (error: Error) => void;
  },
): { abort: () => void } {
  const xhr = new XMLHttpRequest();
  const form = new FormData();
  form.append("file", file);
  form.append("mediaId", mediaId);

  xhr.upload.onprogress = (event) => {
    if (!handlers.onProgress || !event.lengthComputable) return;
    handlers.onProgress(Math.round((event.loaded / event.total) * 100));
  };

  xhr.onload = () => {
    let payload: { error?: string; mediaId?: string; url?: string } = {};
    try {
      payload = JSON.parse(xhr.responseText || "{}");
    } catch {
      handlers.onError?.(new Error("Falha ao enviar vídeo."));
      return;
    }
    if (xhr.status >= 200 && xhr.status < 300 && payload.mediaId) {
      handlers.onSuccess?.({ url: payload.url });
      return;
    }
    handlers.onError?.(new Error(payload.error || "Falha ao enviar vídeo."));
  };

  xhr.onerror = () => handlers.onError?.(new Error("Falha ao enviar vídeo."));
  xhr.onabort = () => handlers.onError?.(new Error("Envio cancelado."));

  xhr.open("POST", "/api/social/videos");
  xhr.withCredentials = true;
  for (const [key, value] of Object.entries(getWaspAuthHeaders())) {
    xhr.setRequestHeader(key, value);
  }
  xhr.send(form);

  return { abort: () => xhr.abort() };
}

/** Reads the duration of a local video file so plan limits fail fast. */
export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration)
        ? Math.round(video.duration)
        : null;
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
