import { useRouter } from 'expo-router';
import React from 'react';
import { displayName, listWorkspaces, useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { MoreScreen } from '../../../src/screens/MoreScreen';

export default function MoreRoute() {
  const { api, user, bootstrap, workspaceId, setWorkspaceId, logout } = useAuth();
  const router = useRouter();
  const profile = useAsync(() => api.mySocialProfile(), []);

  return (
    <MoreScreen
      name={displayName(user)}
      workspaces={listWorkspaces(bootstrap)}
      workspaceId={workspaceId}
      profile={profile.data}
      onSelectWorkspace={(id) => setWorkspaceId(id)}
      onOpenBible={() => router.push('/(app)/bible')}
      onOpenDocuments={() => router.push('/(app)/documents')}
      onOpenCatechumens={() => router.push('/(app)/catechumens')}
      onOpenFamilies={() => router.push('/(app)/families')}
      onOpenCalendar={() => router.push('/(app)/calendar')}
      onOpenAnnouncements={() => router.push('/(app)/announcements')}
      onOpenJourneys={() => router.push('/(app)/journeys')}
      onOpenCatechism={() => router.push('/(app)/catechism')}
      onOpenNotifications={() => router.push('/(app)/notifications')}
      onOpenEditProfile={() => router.push('/(app)/community/edit')}
      onOpenProfile={() => {
        if (profile.data?.handle) router.push(`/(app)/community/${profile.data.handle}`);
      }}
      onLogout={() => logout()}
    />
  );
}
