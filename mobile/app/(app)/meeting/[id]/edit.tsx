import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { Screen, SkeletonList } from '../../../../src/components/ui';
import { useAsync } from '../../../../src/hooks/useAsync';
import { useMutation } from '../../../../src/hooks/useMutation';
import type { MeetingInput } from '../../../../src/api/client';
import { MeetingFormScreen } from '../../../../src/screens/MeetingFormScreen';

export default function EditMeetingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const detail = useAsync(() => api.meetingDetails(String(id)), [id]);
  const update = useMutation((values: MeetingInput) => api.updateMeeting(String(id), values), {
    successMessage: 'Encontro atualizado.',
    onSuccess: () => router.back(),
  });

  if (detail.loading && !detail.data) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }

  return (
    <MeetingFormScreen
      mode="edit"
      className={detail.data?.class?.name}
      initial={detail.data ? { title: detail.data.title, theme: detail.data.theme, date: detail.data.date || detail.data.startsAt, notes: detail.data.notes } : null}
      busy={update.busy}
      error={update.error ?? detail.error}
      onSubmit={(values) => void update.run(values)}
    />
  );
}
