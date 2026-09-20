import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { GroupDetailScreen } from '../../../src/screens/DetailScreens';

export default function GroupDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.groupDetails(String(id)), [id]);
  const [notice, setNotice] = React.useState('');
  return (
    <GroupDetailScreen
      group={data}
      loading={loading}
      error={error}
      notice={notice}
      onNotice={setNotice}
      onJoin={async () => {
        await api.joinGroup(String(id));
        await reload();
      }}
      onLeave={async () => {
        await api.leaveGroup(String(id));
        await reload();
      }}
      onPostNotice={async () => {
        await api.postGroupNotice(String(id), notice);
        setNotice('');
        await reload();
      }}
    />
  );
}
