import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useMutation } from '../../../src/hooks/useMutation';
import type { MeetingInput } from '../../../src/api/client';
import { MeetingFormScreen } from '../../../src/screens/MeetingFormScreen';

export default function NewMeetingRoute() {
  const { classId, className } = useLocalSearchParams<{ classId: string; className?: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const create = useMutation((values: MeetingInput) => api.createMeeting({ ...values, classId: String(classId) }), {
    successMessage: 'Encontro criado.',
    onSuccess: (created) => router.replace(`/(app)/meeting/${created.id}`),
  });

  return <MeetingFormScreen mode="create" className={className} busy={create.busy} error={create.error} onSubmit={(values) => void create.run(values)} />;
}
