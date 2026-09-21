import { Upload } from 'tus-js-client';

export function uploadVideoToStream(
  file: { uri: string; name: string; type: string },
  ticket: {
    tusEndpoint: string;
    authorizationSignature: string;
    authorizationExpire: number;
    videoId: string;
    libraryId: string;
  },
) {
  return fetch(file.uri)
    .then((response) => response.blob())
    .then(
      (blob) =>
        new Promise<void>((resolve, reject) => {
          const upload = new Upload(blob, {
            endpoint: ticket.tusEndpoint,
            retryDelays: [0, 3000, 5000],
            headers: {
              AuthorizationSignature: ticket.authorizationSignature,
              AuthorizationExpire: String(ticket.authorizationExpire),
              VideoId: ticket.videoId,
              LibraryId: ticket.libraryId,
            },
            metadata: { filetype: file.type, title: file.name.slice(0, 120) },
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          });
          upload.start();
        }),
    );
}
