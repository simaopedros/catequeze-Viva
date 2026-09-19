import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { MessagesScreen } from '../../../src/screens/MessagesScreen';

export default function MessagesRoute() {
  const { api, workspaceId, user } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload, refreshing } = useAsync(
    () => api.conversations(workspaceId || undefined),
    [workspaceId],
  );

  return (
    <MessagesScreen
      payload={data}
      loading={loading}
      error={error}
      currentUserId={user?.id}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      onOpen={(id) => router.push(`/(app)/messages/${id}`)}
      onNewConversation={() => router.push('/(app)/messages/new')}
    />
  );
}
