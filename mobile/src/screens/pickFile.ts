import * as ImagePicker from 'expo-image-picker';
import type { UploadFileInput } from '../api/client';

function toUploadFile(asset: any, fallbackName: string, fallbackType: string): UploadFileInput {
  // expo-image-picker no web expõe o File original; no nativo usamos uri+name+type.
  if (asset.file) return asset.file as File;
  return {
    uri: asset.uri,
    name: asset.fileName || `${fallbackName}-${Date.now()}`,
    type: asset.mimeType || fallbackType,
  };
}

export async function pickImageFile(): Promise<UploadFileInput | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.length) return null;
  return toUploadFile(result.assets[0], 'foto.jpg', 'image/jpeg');
}

/** Documentos (PDF ou imagem) via expo-document-picker. */
export async function pickDocumentFile(): Promise<UploadFileInput | null> {
  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  if (asset.file) return asset.file as File;
  return { uri: asset.uri, name: asset.name || `documento-${Date.now()}`, type: asset.mimeType || 'application/octet-stream' };
}

export async function pickVideoFile(): Promise<UploadFileInput | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
  });
  if (result.canceled || !result.assets?.length) return null;
  return toUploadFile(result.assets[0], 'video.mp4', 'video/mp4');
}
