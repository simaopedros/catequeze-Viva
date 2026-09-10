import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import type { SocialShare } from '../../../src/api/types';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { ComposeScreen } from '../../../src/screens/ComposeScreen';

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
      onPublish={async (body, share) => {
        setBusy(true);
        setError(null);
        try {
          await api.createPost({
            body,
            share: share || (params.kind && params.sourceId ? { kind: String(params.kind), sourceId: String(params.sourceId) } : null),
          });
          router.back();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Não foi possível publicar.');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
