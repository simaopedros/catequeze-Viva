import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { displayName, listWorkspaces, useAuth } from '../../../src/auth/AuthContext';
import { copy } from '../../../src/copy/ptBR';
import { useToast } from '../../../src/feedback/Toast';
import { useAsync } from '../../../src/hooks/useAsync';
import { MoreScreen } from '../../../src/screens/MoreScreen';

export default function MoreRoute() {
  const { api, user, bootstrap, workspaceId, setWorkspaceId, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const profile = useAsync(() => api.mySocialProfile(), []);
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile.data) {
      setHandle(profile.data.handle || '');
      setBio(profile.data.bio || '');
    }
  }, [profile.data]);

  return (
    <MoreScreen
      name={displayName(user)}
      workspaces={listWorkspaces(bootstrap)}
      workspaceId={workspaceId}
      profile={profile.data}
      handle={handle}
      bio={bio}
      onHandleChange={setHandle}
      onBioChange={setBio}
      saving={saving}
      error={error}
      onSelectWorkspace={(id) => setWorkspaceId(id)}
      onOpenBible={() => router.push('/(app)/bible')}
      onOpenDocuments={() => router.push('/(app)/documents')}
      onOpenNotifications={() => router.push('/(app)/notifications')}
      onOpenCommunity={() => router.push('/(app)/(tabs)/community')}
      onOpenEditProfile={() => router.push('/(app)/community/edit')}
      onOpenProfile={() => {
        if (profile.data?.handle) router.push(`/(app)/community/${profile.data.handle}`);
      }}
      onSaveProfile={async () => {
        setSaving(true);
        setError(null);
        try {
          await api.updateSocialProfile({ handle, bio });
          toast.show(copy.editProfile.saved);
          await profile.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : copy.editProfile.error);
        } finally {
          setSaving(false);
        }
      }}
      onLogout={() => logout()}
    />
  );
}
