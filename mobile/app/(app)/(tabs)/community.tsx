import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { useAuth } from "../../../src/auth/AuthContext";
import { useAsync } from "../../../src/hooks/useAsync";
import { usePagedList } from "../../../src/hooks/usePagedList";
import { usePostActions } from "../../../src/hooks/usePostActions";
import { openCommunityArea } from "../../../src/screens/communityNavigation";
import { CommunityScreen } from "../../../src/screens/CommunityScreen";

export default function CommunityRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const [sort, setSort] = useState<"recent" | "trending" | "foryou">("recent");
  const [topicSlug, setTopicSlug] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const feed = usePagedList(
    (cursor) => api.socialFeed({ sort, topicSlug, following, cursor }),
    [sort, topicSlug, following],
  );
  const topics = useAsync(() => api.socialTopics(), []);
  const access = useAsync(() => api.socialAccess(), []);
  const me = useAsync(() => api.mySocialProfile(), []);
  const postActions = usePostActions(() => void feed.reload());

  useFocusEffect(
    useCallback(() => {
      if (feed.items.length > 0) void feed.reload();
    }, [feed.items.length, feed.reload]),
  );

  return (
    <>
      <CommunityScreen
        posts={feed.items}
        topics={topics.data ?? []}
        access={access.data}
        sort={sort}
        topicSlug={topicSlug}
        following={following}
        loading={feed.loading}
        error={feed.error}
        refreshing={feed.refreshing}
        onRefresh={() => void feed.reload()}
        hasMore={Boolean(feed.nextCursor)}
        loadingMore={feed.loadingMore}
        onLoadMore={() => void feed.loadMore()}
        showHub
        onOpenArea={(area) => openCommunityArea(router, area, me.data?.handle)}
        onChangeSort={setSort}
        onChangeTopic={setTopicSlug}
        onToggleFollowing={() => setFollowing((value) => !value)}
        onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
        onOpenPost={(slug) => router.push(`/(app)/community/p/${slug}`)}
        onOpenTopic={(slug) => router.push(`/(app)/community/t/${slug}`)}
        onCompose={() => router.push("/(app)/community/compose")}
        onSearch={() => router.push("/(app)/community/search")}
        onSharePost={(post) => void postActions.share(post)}
        onDeletePost={postActions.requestDelete}
      />
      {postActions.dialog}
    </>
  );
}
