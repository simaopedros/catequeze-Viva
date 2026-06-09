/**
 * Client-side multipart document upload (replaces base64 in Wasp actions).
 */
export type DocumentUploadParams = {
  file: File;
  name: string;
  type: string;
  catechumenProfileId?: string;
  parishId?: string;
};

export type PublicDocumentUploadParams = {
  file: File;
  token: string;
  type: string;
};

function getServerUrl(): string {
  const envUrl = (import.meta as any).env?.REACT_APP_WASP_SERVER_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname.startsWith('familia.')) {
      return `${protocol}//api.${hostname.replace(/^familia\./, '')}`;
    }
    if (hostname.startsWith('homolog.') || hostname.includes('.homolog.')) {
      return `${protocol}//api.homolog.catechis.app`;
    }
    return `${protocol}//api.${hostname.replace(/^www\./, '')}`;
  }
  return 'http://localhost:3001';
}

export async function uploadDocumentMultipart(
  params: DocumentUploadParams,
): Promise<{ success: boolean; document: { id: string; name: string } }> {
  const form = new FormData();
  form.append('file', params.file);
  form.append('name', params.name);
  form.append('type', params.type);
  if (params.catechumenProfileId) form.append('catechumenProfileId', params.catechumenProfileId);
  if (params.parishId) form.append('parishId', params.parishId);

  const res = await fetch(`${getServerUrl()}/api/documents/upload`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao enviar documento.');
  }
  return data;
}

export async function uploadPublicDocumentMultipart(
  params: PublicDocumentUploadParams,
): Promise<{ success: boolean; document: { id: string; name: string } }> {
  const form = new FormData();
  form.append('file', params.file);
  form.append('token', params.token);
  form.append('type', params.type);

  const res = await fetch(`${getServerUrl()}/api/upload-document`, {
    method: 'POST',
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao enviar documento.');
  }
  return data;
}

export function readFileAsUpload(file: File): Promise<File> {
  return Promise.resolve(file);
}
