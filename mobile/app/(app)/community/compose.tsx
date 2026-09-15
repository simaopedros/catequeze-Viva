import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import type { SocialShare } from '../../../src/api/types';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { asItems } from '../../../src/lib/payload';
import { ComposeScreen, type DraftMedia, type SharePickerHit } from '../../../src/screens/ComposeScreen';

export default function ComposeRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string; sourceId?: string }>();
  const access = useAsync(() => api.socialAccess(), []);
  const topics = useAsync(() => api.socialTopics(), []);
  const [preview, setPreview] = useState<SocialShare | null>(null);
  const [media, setMedia] = useState<DraftMedia[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerKind, setPickerKind] = useState<'CATECHISM' | 'DOCUMENT' | null>(null);
  const [pickerHits, setPickerHits] = useState<SharePickerHit[]>([]);

  useEffect(() => {
    const kind = params.kind ? String(params.kind) : '';
    const sourceId = params.sourceId ? String(params.sourceId) : '';
    if (!kind || !sourceId || kind === 'MEETING') return;
    let cancelled = false;
    api
      .previewShare(kind, sourceId)
      .then((card) => {
        if (!cancelled) setPreview(card);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Partilha inválida.');
      });
    return () => {
      cancelled = true;
    };
  }, [api, params.kind, params.sourceId]);

  async function pick(kind: 'image' | 'video') {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Precisa de autorizar a galeria para anexar média.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'video' ? ['videos'] : ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const file = {
      uri: asset.uri,
      name: asset.fileName || (kind === 'video' ? 'video.mp4' : 'photo.jpg'),
      type: asset.mimeType || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
    };
    setBusy(true);
    try {
      if (kind === 'image') {
        const uploaded = await api.uploadSocialImage(file);
        setMedia((current) => [...current, { mediaId: uploaded.mediaId, kind: 'IMAGE', url: uploaded.url }]);
      } else {
        const ticket = await api.createVideoUpload({ title: file.name, durationSeconds: asset.duration || undefined });
        await api.uploadSocialVideo(file, ticket.mediaId);
        setMedia((current) => [...current, { mediaId: ticket.mediaId, kind: 'VIDEO', url: asset.uri }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a média.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ComposeScreen
      canPublish={Boolean(access.data?.canPublish)}
      access={access.data}
      accessLoading={access.loading}
      topics={topics.data ?? []}
      media={media}
      preview={preview}
      pickerHits={pickerHits}
      pickerKind={pickerKind}
      busy={busy}
      error={error}
      onPickImage={() => void pick('image')}
      onPickVideo={() => void pick('video')}
      onRemoveMedia={(id) => setMedia((current) => current.filter((item) => item.mediaId !== id))}
      onOpenVersePicker={() => router.push('/(app)/bible')}
      onClosePicker={() => {
        setPickerKind(null);
        setPickerHits([]);
      }}
      onPreviewShare={async (kind, sourceId) => {
        setError(null);
        try {
          setPreview(await api.previewShare(kind, sourceId));
          setPickerKind(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Partilha inválida.');
        }
      }}
      onSearchPicker={async (kind, query) => {
        setPickerKind(kind);
        setError(null);
        try {
          if (kind === 'CATECHISM') {
            const payload = query.trim().length >= 3 ? await api.catechismSearch(query.trim()) : [];
            setPickerHits(
              asItems(payload).map((row: any) => ({
                id: String(row.id || row.number),
                title: `${row.number ?? ''} · ${row.question || 'Artigo'}`,
                subtitle: row.answer,
              })),
            );
            return;
          }
          const payload = await api.content(workspaceId || undefined, query.trim() || undefined);
          setPickerHits(
            asItems(payload).map((row: any) => ({
              id: String(row.id),
              title: row.title || row.name || 'Recurso',
              subtitle: row.summary || row.status,
            })),
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Pesquisa indisponível.');
        }
      }}
      onPublish={async (draft) => {
        setBusy(true);
        setError(null);
        try {
          await api.createPost(draft);
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
