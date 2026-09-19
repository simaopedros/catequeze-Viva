import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import type { SocialShare } from '../../../src/api/types';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { ComposeScreen } from '../../../src/screens/ComposeScreen';

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoPreviewed = useRef(false);

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
      onPreviewShare={async (kind, sourceId) => {
        setError(null);
        try {
          setPreview(await api.previewShare(kind, sourceId));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Partilha inválida.');
        }
      }}
      onPublish={async (body, share, topicSlugs) => {
        setBusy(true);
        setError(null);
        try {
          await api.createPost({
            body,
            share:
              share || (initialKind && initialSourceId ? { kind: initialKind, sourceId: initialSourceId } : null),
            topicSlugs: topicSlugs && topicSlugs.length > 0 ? topicSlugs : undefined,
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
