import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import type { SocialShare } from '../../../src/api/types';
import { uploadVideoToStream } from '../../../src/api/uploadVideo';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { ComposeScreen, type DraftMedia, type PostKind } from '../../../src/screens/ComposeScreen';

export default function ComposeRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string; sourceId?: string }>();
  const access = useAsync(() => api.socialAccess(), []);
  const [preview, setPreview] = useState<SocialShare | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <ComposeScreen
      canPublish={Boolean(access.data?.canPublish)}
      accessLoading={access.loading}
      preview={preview}
      busy={busy}
      error={error}
      onPreviewShare={async (kind, sourceId) => {
        setError(null);
        try {
          setPreview(await api.previewShare(kind, sourceId));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Partilha inválida.');
        }
      }}
      initialKind={params.kind ? String(params.kind) : 'TEXT'}
      initialSourceId={params.sourceId ? String(params.sourceId) : ''}
      onOpenBible={() => router.push('/(app)/bible')}
      onSearch={async (kind: PostKind, query: string) => {
        if (kind === 'CATECHISM') {
          const rows = await api.searchCatechism(query);
          return (rows ?? []).map((row: any) => ({ id: row.id, title: `${row.number} · ${row.question || row.title || ''}` }));
        }
        if (kind === 'DIRECTORY') {
          const rows = await api.searchDirectory(query);
          return (rows ?? []).map((row) => ({ id: row.id, title: row.title || String(row.number || '') }));
        }
        const rows = await api.searchContent(query);
        const ai = kind === 'AI_ARTIFACT';
        return (rows ?? [])
          .filter((row) => Boolean(row.isAiGenerated) === ai)
          .map((row) => ({ id: row.id, title: row.title }));
      }}
      onPickMedia={async (kind): Promise<DraftMedia | null> => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) throw new Error('Permita o acesso à galeria.');
        const picked = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: kind === 'IMAGE' ? ['images'] : ['videos'],
          quality: 0.85,
        });
        if (picked.canceled || !picked.assets[0]) return null;
        const asset = picked.assets[0];
        const file = {
          uri: asset.uri,
          name: asset.fileName || (kind === 'IMAGE' ? 'foto.jpg' : 'video.mp4'),
          type: asset.mimeType || (kind === 'IMAGE' ? 'image/jpeg' : 'video/mp4'),
        };
        if (kind === 'IMAGE') {
          const uploaded = await api.uploadImage(file);
          return { mediaId: uploaded.mediaId, url: uploaded.url || asset.uri, kind };
        }
        const seconds = asset.duration ? Math.round(asset.duration / 1000) : undefined;
        const ticket = await api.createVideoUpload(seconds);
        if (ticket.transport === 'stream') await uploadVideoToStream(file, ticket);
        else await api.uploadVideoFile(ticket.mediaId, file);
        return { mediaId: ticket.mediaId, url: asset.uri, kind };
      }}
      onPublish={async (body, extra) => {
        setBusy(true);
        setError(null);
        try {
          await api.createPost({
            body,
            mediaIds: extra.mediaIds,
            mediaConsentAck: extra.mediaConsentAck,
            share: extra.share || (params.kind && params.sourceId ? { kind: String(params.kind), sourceId: String(params.sourceId) } : null),
          });
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
