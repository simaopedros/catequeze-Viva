import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export type DocumentFileAccess = { url: string; headers: Record<string, string> };

const MIME_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'text/plain': '.txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

function safeFileName(doc: any): string {
  const normalized = String(doc?.title || doc?.name || 'documento').normalize('NFD');
  const base =
    normalized
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'documento';
  const ext = MIME_EXTENSIONS[String(doc?.mimeType || '')] || '';
  return `${base}${ext}`;
}

async function openOnWeb(file: DocumentFileAccess): Promise<void> {
  const response = await fetch(file.url, { headers: file.headers });
  if (!response.ok) {
    throw new Error(`Não foi possível abrir o documento (${response.status}).`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

async function openOnNative(file: DocumentFileAccess, doc: any): Promise<void> {
  const directory = FileSystem.cacheDirectory;
  if (!directory) {
    throw new Error('Armazenamento temporário indisponível neste dispositivo.');
  }
  const target = `${directory}${safeFileName(doc)}`;
  const result = await FileSystem.downloadAsync(file.url, target, { headers: file.headers });
  if (result.status >= 400) {
    throw new Error(`Não foi possível abrir o documento (${result.status}).`);
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: typeof doc?.mimeType === 'string' ? doc.mimeType : undefined,
      dialogTitle: doc?.title || doc?.name || 'Documento',
    });
    return;
  }
  throw new Error('A partilha de ficheiros não está disponível neste dispositivo.');
}

export async function openDocumentFile(file: DocumentFileAccess, doc: any): Promise<void> {
  if (Platform.OS === 'web') {
    return openOnWeb(file);
  }
  return openOnNative(file, doc);
}
