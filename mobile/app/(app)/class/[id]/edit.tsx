import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { SkeletonList, Screen } from '../../../../src/components/ui';
import { useAsync } from '../../../../src/hooks/useAsync';
import { useMutation } from '../../../../src/hooks/useMutation';
import { ClassFormScreen, type ClassFormValues } from '../../../../src/screens/ClassFormScreen';

export default function EditClassRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const detail = useAsync(() => api.classDetails(String(id)), [id]);
  const communities = useAsync(() => api.communities(workspaceId || undefined), [workspaceId]);
  const update = useMutation((values: ClassFormValues) => api.updateClass(String(id), values), {
    successMessage: 'Turma atualizada.',
    onSuccess: () => router.back(),
  });

  const initial = useMemo(() => {
    const data = detail.data;
    if (!data) return null;
    return {
      name: data.name,
      communityId: data.communityId ?? data.community?.id ?? null,
      dayOfWeek: data.dayOfWeek ?? undefined,
      startTime: data.startTime ?? undefined,
      endTime: data.endTime ?? undefined,
      location: data.location ?? undefined,
      maxCapacity: data.maxCapacity ?? undefined,
      status: data.status ?? undefined,
    } as Partial<ClassFormValues>;
  }, [detail.data]);

  if (detail.loading && !detail.data) {
    return (
      <Screen>
        <SkeletonList rows={4} />
      </Screen>
    );
  }

  return (
    <ClassFormScreen
      mode="edit"
      initial={initial}
      communities={Array.isArray(communities.data) ? communities.data : communities.data?.items ?? []}
      busy={update.busy}
      error={update.error ?? detail.error}
      onSubmit={(values) => void update.run(values)}
    />
  );
}
