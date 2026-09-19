import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useAuth, usePermissions } from '../../../../src/auth/AuthContext';
import { ConfirmDialog } from '../../../../src/components/ui';
import { useAsync } from '../../../../src/hooks/useAsync';
import { useMutation } from '../../../../src/hooks/useMutation';
import { MeetingScreen } from '../../../../src/screens/MeetingScreen';

export default function MeetingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => api.meetingDetails(String(id)), [id]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const changeStatus = useMutation((status: string) => api.updateMeeting(String(id), { status }), {
    successMessage: 'Estado atualizado.',
    onSuccess: () => void reload(),
  });
  const remove = useMutation(() => api.deleteMeeting(String(id)), {
    successMessage: 'Encontro apagado.',
    onSuccess: () => router.back(),
  });

  const classId = data?.class?.id || data?.classId;
  const canOperate = permissions.canOperate;

  return (
    <>
      <MeetingScreen
        data={data}
        loading={loading}
        error={error}
        onAttendance={() => router.push({ pathname: `/(app)/meeting/${id}/attendance`, params: classId ? { classId } : {} })}
        onEdit={canOperate ? () => router.push(`/(app)/meeting/${id}/edit`) : undefined}
        onChangeStatus={canOperate ? (status) => void changeStatus.run(status) : undefined}
        onDelete={permissions.canManageClasses ? () => setConfirmDelete(true) : undefined}
        onOpenClass={classId ? () => router.push(`/(app)/class/${classId}`) : undefined}
        onShare={() => router.push({ pathname: '/(app)/community/compose', params: { kind: 'MEETING', sourceId: String(id) } })}
      />
      <ConfirmDialog
        visible={confirmDelete}
        title="Apagar encontro"
        body="Os registos de presença deste encontro também são removidos."
        confirmLabel="Apagar"
        destructive
        loading={remove.busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await remove.run();
          setConfirmDelete(false);
        }}
      />
    </>
  );
}
