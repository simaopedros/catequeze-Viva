import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { useMutation } from '../../../../src/hooks/useMutation';
import { asCatechumenList } from '../../../../src/screens/CatechumensListScreen';
import { EnrollCatechumensScreen } from '../../../../src/screens/PickerScreens';

export default function EnrollRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const detail = useAsync(() => api.classDetails(String(id)), [id]);
  const candidates = useAsync(() => api.catechumens({ workspaceId: workspaceId || undefined }), [workspaceId]);
  const enroll = useMutation((ids: string[]) => api.enrollCatechumens(String(id), ids), {
    successMessage: (result: any) => (typeof result?.enrolled === 'number' ? `${result.enrolled} inscrito(s).` : 'Inscrição concluída.'),
    onSuccess: () => router.back(),
  });

  const enrolledIds = (detail.data?.enrollments ?? [])
    .filter((enrollment: any) => enrollment.status !== 'CANCELLED')
    .map((enrollment: any) => enrollment.catechumenProfileId || enrollment.catechumenProfile?.id)
    .filter(Boolean);

  return (
    <EnrollCatechumensScreen
      className={detail.data?.name}
      candidates={asCatechumenList(candidates.data)}
      alreadyEnrolledIds={enrolledIds}
      loading={candidates.loading || detail.loading}
      error={candidates.error}
      busy={enroll.busy}
      actionError={enroll.error}
      onSubmit={(ids) => void enroll.run(ids)}
      onCreateCatechumen={() => router.push('/(app)/catechumen/new')}
    />
  );
}
