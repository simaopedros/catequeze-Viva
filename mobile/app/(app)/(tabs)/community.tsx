import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import type { SocialComment, SocialPost } from '../../../src/api/types';
import { feedQueryForTab, type FeedTabId } from '../../../src/lib/social';
import { CommunityScreen } from '../../../src/screens/CommunityScreen';

export default function CommunityRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<FeedTabId>('foryou');
  const [items, setItems] = useState<SocialPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [commentsBusy, setCommentsBusy] = useState(false);
  const query = useMemo(() => feedQueryForTab(tab), [tab]);
  const feed = useAsync(
    () => api.socialFeed({ ...query, cursor: null, limit: 20 }),
    [query.sort, query.following, query.videoFormat],
  );
  const me = useAsync(() => api.mySocialProfile().catch(() => null), []);

  useEffect(() => {
    if (!feed.data) return;
    setItems(feed.data.items);
    setCursor(feed.data.nextCursor);
    const authorIds = [...new Set(feed.data.items.map((item) => item.author.id))];
    if (authorIds.length === 0) return;
    void api.socialFollowState(authorIds).then((state) => setFollowingIds(state.following || []));
  }, [api, feed.data]);

  useFocusEffect(
    useCallback(() => {
      if (feed.data) void feed.reload();
    }, [feed.data, feed.reload]),
  );

  return (
    <CommunityScreen
      posts={items}
      tab={tab}
      loading={feed.loading}
      error={feed.error}
      hasMore={Boolean(cursor)}
      followingIds={followingIds}
      comments={comments}
      commentsBusy={commentsBusy}
      onChangeTab={setTab}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onOpenPost={(slug) => router.push(`/(app)/community/p/${slug}`)}
      onCompose={() => router.push('/(app)/community/compose')}
      onUpload={() => router.push('/(app)/community/upload')}
      onSearch={() => router.push('/(app)/community/search')}
      onOpenProfile={() => {
        const handle = me.data?.handle || me.data?.socialHandle;
        if (handle) router.push(`/(app)/community/${handle}`);
        else router.push('/(app)/community/edit');
      }}
      onLoadMore={async () => {
        if (!cursor) return;
        const page = await api.socialFeed({ ...query, cursor, limit: 20 });
        setItems((current) => [...current, ...page.items]);
        setCursor(page.nextCursor);
      }}
      onReact={async (postId, type) => {
        await api.toggleReaction(postId, type);
        await feed.reload();
      }}
      onLoadComments={async (postId) => {
        setCommentsBusy(true);
        try {
          const payload = await api.socialComments(postId);
          setComments(payload.items || []);
        } finally {
          setCommentsBusy(false);
        }
      }}
      onComment={async (postId, body) => {
        await api.createComment(postId, body);
        const payload = await api.socialComments(postId);
        setComments(payload.items || []);
      }}
      onFollow={async (authorId) => {
        await api.toggleFollow(authorId);
        const authorIds = [...new Set(items.map((item) => item.author.id))];
        const state = await api.socialFollowState(authorIds);
        setFollowingIds(state.following || []);
      }}
      onWatch={(postId) => {
        void api.recordSocialWatch(postId, 1).catch(() => undefined);
      }}
      onOpenLong={(post) => router.push(`/(app)/community/watch/${post.slug || post.id}`)}
    />
  );
}
