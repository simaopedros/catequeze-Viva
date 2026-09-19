import { Platform, Share } from 'react-native';

/** Guarda texto num ficheiro e abre a folha de partilha (nativo) ou descarrega (web). */
export async function shareTextFile(filename: string, content: string, mimeType = 'text/csv'): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([`\ufeff${content}`], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const FileSystem = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
  const uri = `${directory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: filename, UTI: 'public.comma-separated-values-text' });
  } else {
    await Share.share({ message: content });
  }
}
