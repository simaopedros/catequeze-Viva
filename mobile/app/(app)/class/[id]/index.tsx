import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useAuth, usePermissions } from '../../../../src/auth/AuthContext';
import { ConfirmDialog } from '../../../../src/components/ui';
import { useAsync } from '../../../../src/hooks/useAsync';
import { useMutation } from '../../../../src/hooks/useMutation';
import { ClassDetailScreen } from '../../../../src/screens/ClassDetailScreen';

export default function ClassRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.classDetails(String(id)), [id]);
  const [pendingUnenroll, setPendingUnenroll] = useState<{ enrollmentId: string; name: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const unenroll = useMutation((enrollmentId: string) => api.cancelEnrollment(String(id), enrollmentId), {
    successMessage: 'Inscrição removida.',
    onSuccess: () => void reload(),
  });
  const openChat = useMutation(() => api.classChat(String(id)), {
    onSuccess: (result) => router.push(`/(app)/messages/${result.conversationId}`),
  });

  const canOperate = permissions.canOperate;
  const canManage = permissions.canManageClasses;

  return (
    <>
      <ClassDetailScreen
        data={data}
        loading={loading}
        error={error}
        refreshing={refreshing}
        onRefresh={() => void reload()}
        onOpenMeeting={(meetingId) => router.push(`/(app)/meeting/${meetingId}`)}
        onOpenCatechumen={(catechumenId) => router.push(`/(app)/catechumen/${catechumenId}`)}
        onOpenAttendance={canOperate ? () => router.push(`/(app)/class/${id}/attendance`) : undefined}
        onOpenChat={canOperate ? () => void openChat.run() : undefined}
        onEdit={canManage ? () => router.push(`/(app)/class/${id}/edit`) : undefined}
        onCreateMeeting={canOperate ? () => router.push({ pathname: '/(app)/meeting/new', params: { classId: String(id), className: data?.name ?? '' } }) : undefined}
        onEnroll={canOperate ? () => router.push(`/(app)/class/${id}/enroll`) : undefined}
        onManageCatechists={canManage ? () => router.push(`/(app)/class/${id}/catechists`) : undefined}
        onUnenroll={canManage ? (enrollmentId, name) => setPendingUnenroll({ enrollmentId, name }) : undefined}
      />
      <ConfirmDialog
        visible={Boolean(pendingUnenroll)}
        title="Remover inscrição"
        body={pendingUnenroll ? `${pendingUnenroll.name} deixa de estar inscrito(a) nesta turma. O histórico de presenças é mantido.` : undefined}
        confirmLabel="Remover"
        destructive
        loading={unenroll.busy}
        onCancel={() => setPendingUnenroll(null)}
        onConfirm={async () => {
          if (!pendingUnenroll) return;
          await unenroll.run(pendingUnenroll.enrollmentId);
          setPendingUnenroll(null);
        }}
      />
    </>
  );
}
