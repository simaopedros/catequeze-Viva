import { getWaspAuthHeaders } from "./documentUpload";

export async function uploadBlogImage(
  file: File,
  postId: string,
): Promise<{ url: string; key: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("postId", postId);

  const response = await fetch("/api/blog/images", {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: getWaspAuthHeaders(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Falha ao enviar imagem.");
  }
  if (!payload?.url || !payload?.key) {
    throw new Error("Resposta de upload inválida.");
  }
  return { url: payload.url as string, key: payload.key as string };
}
