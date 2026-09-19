import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import type { SocialShare } from '../../../src/api/types';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { ComposeScreen, type ComposeAttachment } from '../../../src/screens/ComposeScreen';
import { pickImageFile, pickVideoFile } from '../../../src/screens/pickFile';

export default function ComposeRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string; sourceId?: string }>();
  const initialKind = params.kind ? String(params.kind) : undefined;
  const initialSourceId = params.sourceId ? String(params.sourceId) : undefined;
  const access = useAsync(() => api.socialAccess(), []);
  const topics = useAsync(() => api.socialTopics(), []);
  const [preview, setPreview] = useState<SocialShare | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([]);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoPreviewed = useRef(false);

  const addAttachment = async (kind: 'IMAGE' | 'VIDEO') => {
    setError(null);
    try {
      const file = kind === 'IMAGE' ? await pickImageFile() : await pickVideoFile();
      if (!file) return;
      setMediaBusy(true);
      const result = kind === 'IMAGE' ? await api.uploadSocialImage(file) : await api.uploadSocialVideo(file);
      if (result?.mediaId) {
        setAttachments((current) => [...current, { mediaId: result.mediaId, url: result.url ?? null, kind }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o ficheiro.');
    } finally {
      setMediaBusy(false);
    }
  };

  useEffect(() => {
    if (autoPreviewed.current || !initialKind || !initialSourceId) return;
    autoPreviewed.current = true;
    api
      .previewShare(initialKind, initialSourceId)
      .then(setPreview)
      .catch((err) => setError(err instanceof Error ? err.message : 'Partilha inválida.'));
  }, [api, initialKind, initialSourceId]);

  return (
    <ComposeScreen
      canPublish={Boolean(access.data?.canPublish)}
      accessLoading={access.loading}
      preview={preview}
      busy={busy}
      error={error}
      initialKind={initialKind}
      initialSourceId={initialSourceId}
      topics={topics.data ?? []}
      selectedTopics={selectedTopics}
      onToggleTopic={(slug) =>
        setSelectedTopics((current) =>
          current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
        )
      }
      attachments={attachments}
      mediaBusy={mediaBusy}
      onAddImage={() => void addAttachment('IMAGE')}
      onAddVideo={() => void addAttachment('VIDEO')}
      onRemoveAttachment={(mediaId) =>
        setAttachments((current) => current.filter((item) => item.mediaId !== mediaId))
      }
      onPreviewShare={async (kind, sourceId) => {
        setError(null);
        try {
          setPreview(await api.previewShare(kind, sourceId));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Partilha inválida.');
        }
      }}
      onPublish={async (body, share, topicSlugs, mediaIds) => {
        setBusy(true);
        setError(null);
        try {
          await api.createPost({
            body,
            share:
              share || (initialKind && initialSourceId ? { kind: initialKind, sourceId: initialSourceId } : null),
            topicSlugs: topicSlugs && topicSlugs.length > 0 ? topicSlugs : undefined,
            mediaIds: mediaIds && mediaIds.length > 0 ? mediaIds : undefined,
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
