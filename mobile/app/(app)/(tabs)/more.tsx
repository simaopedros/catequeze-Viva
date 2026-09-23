import { useRouter } from 'expo-router';
import React from 'react';
import { displayName, useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { appRoutes } from '../../../src/navigation/routes';
import { MoreScreen } from '../../../src/screens/MoreScreen';

const MENU_ROUTES: Record<string, string> = {
  calendar: '/(app)/calendar',
  announcements: '/(app)/announcements',
  journeys: '/(app)/journeys',
  bible: '/(app)/bible',
  catechism: '/(app)/catechism',
  documents: '/(app)/documents',
  catechumens: '/(app)/catechumens',
  families: '/(app)/families',
  notifications: '/(app)/notifications',
};

export default function MoreRoute() {
  const { api, user, logout } = useAuth();
  const router = useRouter();
  const profile = useAsync(() => api.mySocialProfile(), []);

  return (
    <MoreScreen
      name={displayName(user)}
      profile={profile.data}
      onOpenWorkspaceSwitch={() => router.push(appRoutes.workspaceSwitch)}
      onOpenMenu={(key) => {
        const href = MENU_ROUTES[key];
        if (href) router.push(href as any);
      }}
      onOpenEditProfile={() => router.push('/(app)/community/edit')}
      onOpenProfile={() => {
        if (profile.data?.handle) router.push(`/(app)/community/${profile.data.handle}`);
      }}
      onLogout={() => logout()}
    />
  );
}
