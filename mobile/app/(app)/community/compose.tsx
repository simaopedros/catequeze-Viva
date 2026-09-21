import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import type { SocialShare } from '../../../src/api/types';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { ComposeScreen, type PostKind } from '../../../src/screens/ComposeScreen';

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
      onPublish={async (body, share) => {
        setBusy(true);
        setError(null);
        try {
          await api.createPost({
            body,
            share: share || (params.kind && params.sourceId ? { kind: String(params.kind), sourceId: String(params.sourceId) } : null),
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
