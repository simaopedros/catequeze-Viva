import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { displayName, useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import type { CommunityFeedScope } from '../../../src/components/communityUi';
import { openCommunityArea } from '../../../src/screens/communityNavigation';
import { DEFAULT_COMPOSE_MEDIA_LIMITS } from '../../../src/social/constants';
import { CommunityScreen } from '../../../src/screens/CommunityScreen';

export default function CommunityRoute() {
  const { api, user } = useAuth();
  const router = useRouter();
  const [sort] = useState<'recent' | 'trending' | 'foryou'>('recent');
  const [topicSlug] = useState<string | null>(null);
  const [following] = useState(false);
  const [feedScope, setFeedScope] = useState<CommunityFeedScope>('all');
  const [composeBusy, setComposeBusy] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const feed = useAsync(() => api.socialFeed({ sort, topicSlug, following }), [sort, topicSlug, following]);
  const access = useAsync(() => api.socialAccess(), []);
  const me = useAsync(() => api.mySocialProfile(), []);

  useFocusEffect(
    useCallback(() => {
      if (feed.data) void feed.reload();
    }, [feed.data, feed.reload]),
  );

  return (
    <CommunityScreen
      posts={feed.data?.items ?? []}
      access={access.data}
      feedScope={feedScope}
      onChangeFeedScope={setFeedScope}
      viewerName={me.data?.displayName || displayName(user)}
      viewerAvatarUrl={me.data?.avatarUrl ?? user?.avatarUrl}
      loading={feed.loading}
      error={feed.error}
      composeBusy={composeBusy}
      composeError={composeError}
      showHub
      onOpenArea={(area) => openCommunityArea(router, area, me.data?.handle)}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onOpenPost={(slug) => router.push(`/(app)/community/p/${slug}`)}
      composeMedia={{
        limits: {
          maxMediaPerPost:
            access.data?.limits?.maxMediaPerPost ?? DEFAULT_COMPOSE_MEDIA_LIMITS.maxMediaPerPost,
          maxVideoSeconds:
            access.data?.limits?.maxVideoSeconds ?? DEFAULT_COMPOSE_MEDIA_LIMITS.maxVideoSeconds,
        },
        uploadAuth: api.getUploadAuth(),
        requestVideoUpload: (opts) => api.createSocialVideoUpload(opts),
      }}
      onPublishPost={async (payload) => {
        setComposeBusy(true);
        setComposeError(null);
        try {
          await api.createPost({
            body: payload.body,
            mediaIds: payload.mediaIds.length ? payload.mediaIds : undefined,
            mediaConsentAck: payload.mediaConsentAck,
          });
          await feed.reload();
        } catch (err) {
          setComposeError(err instanceof Error ? err.message : 'Não foi possível publicar.');
          throw err;
        } finally {
          setComposeBusy(false);
        }
      }}
      onOpenLink={() => router.push('/(app)/community/search')}
    />
  );
}
