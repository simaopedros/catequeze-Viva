import { getServerUrl, getWaspAuthHeaders } from "./documentUpload";

export async function uploadOfficialResourceAttachment(params: {
  resourceId: string;
  workspaceId?: string;
  file: File;
}): Promise<{
  success: boolean;
  attachment: {
    id: string;
    name: string;
    mimeType: string | null;
    sizeBytes: number | null;
    createdAt: string;
  };
}> {
  const form = new FormData();
  form.append("file", params.file);
  if (params.workspaceId) form.append("workspaceId", params.workspaceId);

  const res = await fetch(
    `${getServerUrl()}/api/official-resources/${params.resourceId}/attachments`,
    {
      method: "POST",
      body: form,
      credentials: "include",
      headers: getWaspAuthHeaders(),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Erro ao anexar o arquivo.");
  }
  return data;
}

export async function downloadOfficialResourceAttachment(params: {
  attachmentId: string;
  name: string;
  workspaceId?: string;
  fileUrl?: string;
}): Promise<void> {
  if (params.fileUrl && /^https?:\/\//i.test(params.fileUrl)) {
    window.open(params.fileUrl, "_blank", "noopener,noreferrer");
    return;
  }

  const qs = params.workspaceId
    ? `?workspaceId=${encodeURIComponent(params.workspaceId)}`
    : "";
  const res = await fetch(
    `${getServerUrl()}/api/official-resources/attachments/${
      params.attachmentId
    }${qs}`,
    {
      credentials: "include",
      headers: getWaspAuthHeaders(),
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao baixar o anexo.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = params.name || "anexo";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
