import { useRouter } from 'expo-router';
import React from 'react';
import { displayName, listWorkspaces, useAuth, workspaceNavContext } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { getMobileBottomTabKeys } from '../../../src/screens/bottomTabs';
import { MoreScreen } from '../../../src/screens/MoreScreen';

export default function MoreRoute() {
  const { api, user, bootstrap, workspaceId, setWorkspaceId, logout } = useAuth();
  const router = useRouter();
  const profile = useAsync(() => api.mySocialProfile(), []);
  const nav = workspaceNavContext(bootstrap, workspaceId);
  const tabKeys = getMobileBottomTabKeys(nav.role, nav.isAdmin);
  const hiddenIds = [
    ...(tabKeys.includes('messages') ? ['messages'] : []),
    ...(tabKeys.includes('calendar') ? ['calendar'] : []),
  ];

  return (
    <MoreScreen
      name={displayName(user)}
      workspaces={listWorkspaces(bootstrap)}
      workspaceId={workspaceId}
      profile={profile.data}
      navContext={{ ...nav, hiddenIds }}
      onSelectWorkspace={(id) => setWorkspaceId(id)}
      onOpenHref={(href) => router.push(href as any)}
      onOpenProfile={() => {
        if (profile.data?.handle) router.push(`/(app)/community/${profile.data.handle}`);
      }}
      onLogout={() => logout()}
    />
  );
}
