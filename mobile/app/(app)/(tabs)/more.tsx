import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { displayName, listWorkspaces, useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { MoreScreen } from '../../../src/screens/MoreScreen';

export default function MoreRoute() {
  const { api, user, bootstrap, workspaceId, setWorkspaceId, logout } = useAuth();
  const router = useRouter();
  const profile = useAsync(() => api.mySocialProfile(), []);
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');

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
      onSelectWorkspace={(id) => setWorkspaceId(id)}
      onOpenBible={() => router.push('/(app)/bible')}
      onOpenDocuments={() => router.push('/(app)/documents')}
      onOpenCommunity={() => router.push('/(app)/(tabs)/community')}
      onOpenEditProfile={() => router.push('/(app)/community/edit')}
      onOpenProfile={() => {
        if (profile.data?.handle) router.push(`/(app)/community/${profile.data.handle}`);
      }}
      onSaveProfile={async () => {
        try {
          await api.updateSocialProfile({ handle, bio });
          Alert.alert('Perfil actualizado', 'O seu @ público foi guardado.');
          await profile.reload();
        } catch (err) {
          Alert.alert('Não foi possível guardar', err instanceof Error ? err.message : '');
        }
      }}
      onLogout={() => logout()}
    />
  );
}
