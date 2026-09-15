import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { VideoUploadScreen } from '../../../src/screens/VideoUploadScreen';

export default function UploadRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [canPublish, setCanPublish] = useState(true);

  React.useEffect(() => {
    api.socialAccess().then((access) => setCanPublish(Boolean(access.canPublish))).catch(() => setCanPublish(false));
  }, [api]);

  async function pick(from: 'camera' | 'gallery') {
    setError(null);
    const permission =
      from === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(from === 'camera' ? 'Autorize a câmara para gravar.' : 'Autorize a galeria para escolher um vídeo.');
      return;
    }
    const result =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 180 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const file = {
      uri: asset.uri,
      name: asset.fileName || 'testemunho.mp4',
      type: asset.mimeType || 'video/mp4',
    };
    setBusy(true);
    setProgress(0.2);
    try {
      const ticket = await api.createVideoUpload({
        title: file.name,
        durationSeconds: asset.duration || undefined,
      });
      setProgress(0.55);
      await api.uploadSocialVideo(file, ticket.mediaId);
      setMediaId(ticket.mediaId);
      setProgress(0.85);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o vídeo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <VideoUploadScreen
      busy={busy}
      progress={progress}
      error={error}
      canPublish={canPublish && Boolean(mediaId)}
      onPickCamera={() => void pick('camera')}
      onPickGallery={() => void pick('gallery')}
      onOpenComposer={() => router.push('/(app)/community/compose')}
      onPublish={async (caption) => {
        if (!mediaId) {
          setError('Escolha um vídeo primeiro.');
          return;
        }
        setBusy(true);
        setError(null);
        try {
          await api.createPost({
            body: caption,
            mediaIds: [mediaId],
            mediaConsentAck: true,
          });
          setProgress(1);
          router.replace('/(app)/(tabs)/community');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Não foi possível publicar.');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
