import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import type { ContentInput } from '../../../../src/api/client';
import { Screen, SkeletonList } from '../../../../src/components/ui';
import { useAsync } from '../../../../src/hooks/useAsync';
import { useMutation } from '../../../../src/hooks/useMutation';
import { ContentFormScreen } from '../../../../src/screens/ContentScreens';

const FIELDS: (keyof ContentInput)[] = ['title', 'theme', 'mainContent', 'pastoralObjective', 'openingPrayer', 'closingPrayer', 'dynamic', 'materials', 'activity', 'familyTask', 'estimatedTime', 'biblicalRef', 'catechismRef', 'tags'];

export default function EditContentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const detail = useAsync(() => api.contentDetails(String(id)), [id]);
  const update = useMutation((values: ContentInput) => api.updateContent(String(id), values), {
    successMessage: 'Conteúdo atualizado.',
    onSuccess: () => router.back(),
  });
  const initial = useMemo(() => {
    if (!detail.data) return null;
    return Object.fromEntries(FIELDS.map((key) => [key, detail.data[key] ?? undefined])) as Partial<ContentInput>;
  }, [detail.data]);

  if (detail.loading && !detail.data) {
    return (
      <Screen>
        <SkeletonList rows={4} />
      </Screen>
    );
  }
  return <ContentFormScreen mode="edit" initial={initial} busy={update.busy} error={update.error ?? detail.error} onSubmit={(values) => void update.run(values)} />;
}
