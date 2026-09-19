import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth, usePermissions } from '../../../src/auth/AuthContext';
import { usePagedList } from '../../../src/hooks/usePagedList';
import { ContentListScreen } from '../../../src/screens/ContentScreens';

export default function ContentListRoute() {
  const { api, workspaceId } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const list = usePagedList(
    (cursor) => api.contentList({ workspaceId: workspaceId || undefined, search: search || undefined, status: status && status !== 'ALL' ? status : undefined, cursor, take: 30 }),
    [workspaceId, search, status],
  );

  useFocusEffect(
    useCallback(() => {
      void list.reload();
    }, [list.reload]),
  );

  return (
    <ContentListScreen
      items={list.items}
      loading={list.loading}
      error={list.error}
      query={query}
      onChangeQuery={setQuery}
      status={status}
      onChangeStatus={(value) => setStatus(value === 'ALL' ? null : value)}
      hasMore={Boolean(list.nextCursor)}
      loadingMore={list.loadingMore}
      onLoadMore={() => void list.loadMore()}
      refreshing={list.refreshing}
      onRefresh={() => void list.reload()}
      onOpen={(id) => router.push(`/(app)/content/${id}`)}
      onCreate={permissions.canOperate ? () => router.push('/(app)/content/new') : undefined}
    />
  );
}
