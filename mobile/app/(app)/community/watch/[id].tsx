import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { isLongVideo, playableVideo, resolveMediaUrl } from '../../../../src/lib/social';
import { LongVideoPlayerScreen } from '../../../../src/screens/LongVideoPlayerScreen';

export default function WatchRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const post = useAsync(() => api.socialPost(String(id)), [id]);
  const data = post.data;
  const video = data ? playableVideo(data) : undefined;
  const uri = resolveMediaUrl(video?.videoUrl || video?.embedUrl || null) || '';

  React.useEffect(() => {
    if (data?.id) void api.recordSocialWatch(data.id, 1);
  }, [api, data?.id]);

  return (
    <LongVideoPlayerScreen
      uri={uri}
      title={data?.body || (isLongVideo(data || { videoFormat: 'LONG' }) ? 'Vídeo longo' : 'Vídeo')}
      onBack={() => router.back()}
    />
  );
}
