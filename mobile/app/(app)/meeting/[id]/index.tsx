import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';
import { useAuth, workspaceNavContext } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { canManagePastoral, canMarkAttendance } from '../../../../src/lib/roleAccess';
import { appRoutes } from '../../../../src/navigation/routes';
import { MeetingScreen } from '../../../../src/screens/MeetingScreen';

export default function MeetingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, bootstrap, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.meetingDetails(String(id)), [id]);
  const nav = workspaceNavContext(bootstrap, workspaceId);

  return (
    <MeetingScreen
      data={data}
      loading={loading}
      error={error}
      canMarkAttendance={canMarkAttendance(nav.role, nav.isAdmin)}
      canWrite={canManagePastoral(nav.role, nav.isAdmin)}
      onAttendance={() => router.push(`/(app)/meeting/${id}/attendance`)}
      onEdit={() =>
        router.push(
          appRoutes.form('meeting', {
            id: String(id),
            classId: data?.classId || data?.class?.id,
            title: data?.title,
          }),
        )
      }
      onDelete={() => {
        Alert.alert('Apagar encontro', 'Esta acção não se desfaz.', [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Apagar',
            style: 'destructive',
            onPress: async () => {
              await api.deleteMeeting(String(id));
              router.back();
            },
          },
        ]);
      }}
    />
  );
}
