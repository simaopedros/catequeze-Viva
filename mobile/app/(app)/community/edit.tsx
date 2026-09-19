import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { EditProfileScreen } from '../../../src/screens/EditProfileScreen';
import { pickImageFile } from '../../../src/screens/pickFile';

export default function EditProfileRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const profile = useAsync(() => api.mySocialProfile(), []);
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.data) return;
    setHandle(profile.data.handle || '');
    setBio(profile.data.bio || '');
    setWebsiteUrl(profile.data.websiteUrl || '');
    setAvatarUrl(profile.data.avatarUrl || null);
  }, [profile.data]);

  return (
    <EditProfileScreen
      handle={handle}
      bio={bio}
      websiteUrl={websiteUrl}
      avatarUrl={avatarUrl}
      displayName={profile.data?.displayName}
      onHandleChange={setHandle}
      onBioChange={setBio}
      onWebsiteChange={setWebsiteUrl}
      busy={busy}
      avatarBusy={avatarBusy}
      error={error || profile.error}
      onPickAvatar={async () => {
        setError(null);
        try {
          const file = await pickImageFile();
          if (!file) return;
          setAvatarBusy(true);
          const result = await api.uploadProfileAvatar(file);
          if (result?.url) setAvatarUrl(result.url);
          await profile.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Não foi possível enviar a foto.');
        } finally {
          setAvatarBusy(false);
        }
      }}
      onOpenProfile={() => {
        if (handle) router.push(`/(app)/community/${handle}`);
      }}
      onOpenBlocked={() => router.push('/(app)/community/blocked')}
      onSave={async () => {
        setBusy(true);
        setError(null);
        try {
          const next = await api.updateSocialProfile({ handle, bio, websiteUrl: websiteUrl || null });
          const nextHandle = next.handle || handle;
          if (nextHandle) router.replace(`/(app)/community/${nextHandle}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Não foi possível guardar.');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
