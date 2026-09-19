import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useAuth, usePermissions } from '../../../../src/auth/AuthContext';
import { ConfirmDialog } from '../../../../src/components/ui';
import { useAsync } from '../../../../src/hooks/useAsync';
import { useMutation } from '../../../../src/hooks/useMutation';
import { CatechumenScreen } from '../../../../src/screens/CatechumenScreen';

export default function CatechumenRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, workspaceId } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => api.catechumenDetails(String(id)), [id]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (data) void reload();
    }, [reload]),
  );

  const remove = useMutation(() => api.deleteCatechumen(String(id)), {
    successMessage: 'Ficha apagada.',
    onSuccess: () => router.back(),
  });
  const message = useMutation(
    async () => {
      const guardian = (data?.household?.guardians ?? []).find((g: any) => g.user?.id);
      if (!guardian?.user?.id || !workspaceId) throw new Error('A família ainda não tem responsável com conta.');
      return api.createConversation({ workspaceId, participantUserIds: [guardian.user.id], type: 'DIRECT' });
    },
    { onSuccess: (conversation: any) => router.push(`/(app)/messages/${conversation.id}`) },
  );

  return (
    <>
      <CatechumenScreen
        data={data}
        loading={loading}
        error={error}
        onOpenFamily={(familyId) => router.push(`/(app)/family/${familyId}`)}
        onOpenClass={(classId) => router.push(`/(app)/class/${classId}`)}
        onEdit={permissions.canOperate ? () => router.push(`/(app)/catechumen/${id}/edit`) : undefined}
        onDelete={permissions.canManageClasses ? () => setConfirmDelete(true) : undefined}
        onMessageGuardian={permissions.canOperate ? () => void message.run() : undefined}
        onOpenDocuments={() => router.push('/(app)/documents')}
      />
      <ConfirmDialog
        visible={confirmDelete}
        title="Apagar catequizando"
        body="A ficha, as inscrições e os registos associados são removidos. Esta ação não pode ser anulada."
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
