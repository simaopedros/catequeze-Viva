import { useRouter } from 'expo-router';
import React from 'react';
import { displayName, listWorkspaces, useAuth } from '../../../src/auth/AuthContext';
import { isWebDestination, NATIVE_ROUTE_BY_ICON, WEB_PATH_BY_ICON } from '../../../src/navigation/destinations';
import { visibleNavForSession } from '../../../src/navigation/navContext';
import { openWebDestination } from '../../../src/lib/openWeb';
import { MoreScreen } from '../../../src/screens/MoreScreen';

export default function MoreRoute() {
  const { api, user, bootstrap, workspaceId, setWorkspaceId, logout } = useAuth();
  const router = useRouter();
  const nav = visibleNavForSession(bootstrap, workspaceId, listWorkspaces(bootstrap));

  return (
    <MoreScreen
      name={displayName(user)}
      workspaces={listWorkspaces(bootstrap)}
      workspaceId={workspaceId}
      groups={nav.sheetGroups}
      onSelectWorkspace={(id) => setWorkspaceId(id)}
      onOpenItem={(iconKey) => {
        if (iconKey === 'birthdays') {
          router.push('/(app)/birthdays');
          return;
        }
        if (isWebDestination(iconKey)) {
          void openWebDestination(api, WEB_PATH_BY_ICON[iconKey] || '/app');
          return;
        }
        const href = NATIVE_ROUTE_BY_ICON[iconKey];
        if (href) router.push(href as any);
      }}
      onLogout={() => logout()}
    />
  );
}
