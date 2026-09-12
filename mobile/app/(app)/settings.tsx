import { useRouter } from 'expo-router';
import React from 'react';
import { listWorkspaces, useAuth } from '../../src/auth/AuthContext';
import { SettingsScreen } from '../../src/screens/SettingsScreen';

export default function SettingsRoute() {
  const { user, bootstrap, workspaceId, setWorkspaceId, logout } = useAuth();
  const router = useRouter();
  return (
    <SettingsScreen
      user={user}
      workspaces={listWorkspaces(bootstrap)}
      workspaceId={workspaceId}
      onSelectWorkspace={(id) => setWorkspaceId(id)}
      onOpenBilling={() => router.push('/(app)/billing')}
      onLogout={() => logout()}
    />
  );
}
