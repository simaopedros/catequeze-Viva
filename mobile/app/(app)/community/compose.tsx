import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import type { SocialShare } from '../../../src/api/types';
import { useAuth } from '../../../src/auth/AuthContext';
import { copy } from '../../../src/copy/ptBR';
import { useToast } from '../../../src/feedback/Toast';
import { hapticSuccess } from '../../../src/feedback/haptics';
import { useAsync } from '../../../src/hooks/useAsync';
import { ComposeScreen } from '../../../src/screens/ComposeScreen';

export default function ComposeRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ kind?: string; sourceId?: string }>();
  const access = useAsync(() => api.socialAccess(), []);
  const [preview, setPreview] = useState<SocialShare | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shareKind = params.kind ? String(params.kind) : '';
  const shareSourceId = params.sourceId ? String(params.sourceId) : '';

  useEffect(() => {
    if (!shareKind || !shareSourceId) return;
    let cancelled = false;
    void (async () => {
      try {
        const next = await api.previewShare(shareKind, shareSourceId);
        if (!cancelled) setPreview(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : copy.compose.invalidShare);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, shareKind, shareSourceId]);

  return (
    <ComposeScreen
      canPublish={Boolean(access.data?.canPublish)}
      accessLoading={access.loading}
      preview={preview}
      busy={busy}
      error={error}
      onOpenBible={() => router.push('/(app)/bible')}
      onPublish={async (body) => {
        setBusy(true);
        setError(null);
        try {
          await api.createPost({
            body,
            share: shareKind && shareSourceId ? { kind: shareKind, sourceId: shareSourceId } : null,
          });
          void hapticSuccess();
          toast.show(copy.compose.published);
          router.replace('/(app)/(tabs)/community');
        } catch (err) {
          setError(err instanceof Error ? err.message : copy.compose.error);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
