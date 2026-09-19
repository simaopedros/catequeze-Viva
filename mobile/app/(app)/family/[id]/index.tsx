import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { useAuth, usePermissions } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { useMutation } from '../../../../src/hooks/useMutation';
import { FamilyScreen } from '../../../../src/screens/FamilyScreen';

export default function FamilyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, workspaceId } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => api.familyDetails(String(id)), [id]);

  useFocusEffect(
    useCallback(() => {
      if (data) void reload();
    }, [reload]),
  );

  const message = useMutation(
    async (guardian: any) => {
      if (!guardian?.user?.id || !workspaceId) throw new Error('Este responsável ainda não tem conta na plataforma.');
      return api.createConversation({ workspaceId, participantUserIds: [guardian.user.id], type: 'DIRECT' });
    },
    { onSuccess: (conversation: any) => router.push(`/(app)/messages/${conversation.id}`) },
  );

  return (
    <FamilyScreen
      data={data}
      loading={loading}
      error={error}
      onOpenCatechumen={(catechumenId) => router.push(`/(app)/catechumen/${catechumenId}`)}
      onEdit={permissions.canManageFamilies ? () => router.push(`/(app)/family/${id}/edit`) : undefined}
      onAddGuardian={permissions.canManageFamilies ? () => router.push({ pathname: `/(app)/family/${id}/guardian`, params: { familyName: data?.name ?? '' } }) : undefined}
      onEditGuardian={
        permissions.canManageFamilies
          ? (guardian) => router.push({ pathname: `/(app)/family/${id}/guardian`, params: { guardianId: guardian.id, familyName: data?.name ?? '' } })
          : undefined
      }
      onMessageGuardian={permissions.canOperate ? (guardian) => void message.run(guardian) : undefined}
    />
  );
}
