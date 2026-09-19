import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useMutation } from '../../../src/hooks/useMutation';
import { CalendarEventFormScreen } from '../../../src/screens/CalendarScreen';

export default function NewCalendarEventRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const create = useMutation(
    (values: { name: string; date: string; endDate?: string; description?: string; type?: string }) => api.createCalendarEvent({ ...values, workspaceId: workspaceId || undefined }),
    { successMessage: 'Evento criado.', onSuccess: () => router.back() },
  );
  return <CalendarEventFormScreen busy={create.busy} error={create.error} onSubmit={(values) => void create.run(values)} />;
}
