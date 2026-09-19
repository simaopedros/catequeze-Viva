import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Share } from 'react-native';
import { useAuth, usePermissions } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { useMutation } from '../../../../src/hooks/useMutation';
import { ContentDetailScreen } from '../../../../src/screens/ContentScreens';

export default function ContentDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.contentDetails(String(id)), [id]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const changeStatus = useMutation((status: string) => api.updateContentStatus(String(id), status), {
    successMessage: 'Estado atualizado.',
    onSuccess: () => void reload(),
  });

  return (
    <ContentDetailScreen
      data={data}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      busy={changeStatus.busy}
      canManage={permissions.canOperate}
      onEdit={permissions.canOperate ? () => router.push(`/(app)/content/${id}/edit`) : undefined}
      onChangeStatus={permissions.canOperate ? (status) => void changeStatus.run(status) : undefined}
      onShare={() => {
        const text = [data?.title, data?.theme, data?.mainContent].filter(Boolean).join('\n\n');
        void Share.share({ message: text }).catch(() => undefined);
      }}
    />
  );
}
