import { getWaspAuthHeaders } from "./documentUpload";

export async function uploadProfileAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/profile/avatar", {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: getWaspAuthHeaders(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Falha ao enviar o avatar.");
  }
  if (!payload?.url) {
    throw new Error("Resposta de upload inválida.");
  }
  return payload.url as string;
}
