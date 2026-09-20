import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { copy } from '../../../src/copy/ptBR';
import { useToast } from '../../../src/feedback/Toast';
import { hapticSuccess } from '../../../src/feedback/haptics';
import { useAsync } from '../../../src/hooks/useAsync';
import { EditProfileScreen } from '../../../src/screens/EditProfileScreen';

export default function EditProfileRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const profile = useAsync(() => api.mySocialProfile(), []);
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.data) return;
    setHandle(profile.data.handle || '');
    setBio(profile.data.bio || '');
    setWebsiteUrl(profile.data.websiteUrl || '');
  }, [profile.data]);

  return (
    <EditProfileScreen
      handle={handle}
      bio={bio}
      websiteUrl={websiteUrl}
      onHandleChange={setHandle}
      onBioChange={setBio}
      onWebsiteChange={setWebsiteUrl}
      busy={busy}
      error={error || profile.error}
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
          void hapticSuccess();
          toast.show(copy.editProfile.saved);
          if (nextHandle) router.replace(`/(app)/community/${nextHandle}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : copy.editProfile.error);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
