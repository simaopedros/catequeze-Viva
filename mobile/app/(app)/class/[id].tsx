import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';
import { useAuth, workspaceNavContext } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { canManagePastoral } from '../../../src/lib/roleAccess';
import { appRoutes } from '../../../src/navigation/routes';
import { ClassDetailScreen } from '../../../src/screens/ClassDetailScreen';

export default function ClassRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, bootstrap, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => api.classDetails(String(id)), [id]);
  const nav = workspaceNavContext(bootstrap, workspaceId);
  const canWrite = canManagePastoral(nav.role, nav.isAdmin);

  return (
    <ClassDetailScreen
      data={data}
      loading={loading}
      error={error}
      canWrite={canWrite}
      onOpenMeeting={(meetingId) => router.push(`/(app)/meeting/${meetingId}`)}
      onOpenCatechumen={(catechumenId) => router.push(`/(app)/catechumens/${catechumenId}`)}
      onEdit={() => router.push(appRoutes.form('class', { id: String(id), name: data?.name }))}
      onCreateMeeting={() => router.push(appRoutes.form('meeting', { classId: String(id) }))}
      onEnroll={() => router.push(appRoutes.form('enroll', { classId: String(id) }))}
      onArchive={() => {
        Alert.alert('Arquivar turma', 'A turma deixa de aparecer nas listas activas.', [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Arquivar',
            style: 'destructive',
            onPress: async () => {
              await api.archiveClass(String(id));
              await reload();
              router.back();
            },
          },
        ]);
      }}
    />
  );
}
