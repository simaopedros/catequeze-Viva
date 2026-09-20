import React, { useState } from 'react';
import { PostCard } from '../components/PostCard';
import {
  AppText,
  BrandButton,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  LoadingState,
  PressableScale,
  Screen,
  ScreenTitle,
  SectionHeader,
} from '../components/ui';
import type { SocialPost, SocialProfile } from '../api/types';
import { copy } from '../copy/ptBR';

export function ProfileScreen({
  profile,
  loading,
  error,
  onFollow,
  onBlock,
  busy,
  posts,
  onOpenPost,
  onOpenAuthor,
  onOpenFollowers,
  onOpenFollowing,
  onEdit,
}: {
  profile?: SocialProfile | null;
  loading?: boolean;
  error?: string | null;
  onFollow: () => void;
  onBlock: () => void;
  busy?: boolean;
  posts?: SocialPost[];
  onOpenPost?: (slug: string) => void;
  onOpenAuthor?: (handle: string) => void;
  onOpenFollowers?: () => void;
  onOpenFollowing?: () => void;
  onEdit?: () => void;
}) {
  const [confirmBlock, setConfirmBlock] = useState(false);
  const data = profile?.profile ?? profile;
  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen>
        <ErrorState title={copy.profile.errorTitle} body={error || copy.profile.notFound} />
      </Screen>
    );
  }

  const handle = data.handle || data.socialHandle;
  const followers = data.followersCount ?? data.followerCount ?? 0;
  const following = data.followingCount ?? 0;
  const displayHandle = handle ? `@${handle}` : copy.profile.noHandle;

  return (
    <Screen testID="profile-screen">
      <ScreenTitle title={data.displayName} subtitle={displayHandle} />
      {data.bio || data.socialBio ? (
        <AppText variant="bodySm" color="inkSoft" style={{ marginBottom: 12 }}>
          {data.bio || data.socialBio}
        </AppText>
      ) : null}
      {data.websiteUrl ? (
        <AppText variant="caption" color="goldMuted" style={{ marginBottom: 12 }}>
          {data.websiteUrl}
        </AppText>
      ) : null}
      <PressableScale testID="open-followers" onPress={onOpenFollowers} disabled={!onOpenFollowers}>
        <AppText variant="bodySm" color="secondary" style={{ marginBottom: 8 }}>
          <AppText variant="bodySm" weight="bold">
            {followers}
          </AppText>{' '}
          seguidores
        </AppText>
      </PressableScale>
      <PressableScale testID="open-following" onPress={onOpenFollowing} disabled={!onOpenFollowing}>
        <AppText variant="bodySm" color="secondary" style={{ marginBottom: 16 }}>
          <AppText variant="bodySm" weight="bold">
            {following}
          </AppText>{' '}
          seguindo
        </AppText>
      </PressableScale>
      {data.isOwn ? (
        <>
          <AppText variant="bodySm" color="secondary" style={{ marginBottom: 8 }}>
            {copy.profile.ownHint}
          </AppText>
          {onEdit ? <BrandButton label={copy.profile.edit} onPress={onEdit} testID="edit-own-profile" /> : null}
        </>
      ) : (
        <>
          <BrandButton
            testID="follow-button"
            label={data.isFollowing ? copy.profile.followingState : copy.profile.follow}
            onPress={onFollow}
            disabled={busy || data.isBlocked}
          />
          <BrandButton
            testID="block-button"
            variant={data.isBlocked ? 'ghost' : 'danger'}
            label={data.isBlocked ? copy.profile.unblock : copy.profile.block}
            onPress={() => {
              if (data.isBlocked) onBlock();
              else setConfirmBlock(true);
            }}
            disabled={busy}
          />
        </>
      )}
      <SectionHeader title={copy.profile.posts} style={{ marginTop: 20 }} />
      {(posts ?? []).length === 0 ? (
        <EmptyState title={copy.profile.emptyPostsTitle} body={copy.profile.emptyPostsBody} />
      ) : (
        (posts ?? []).map((post) => (
          <PostCard key={post.id} post={post} onOpenAuthor={onOpenAuthor} onOpenPost={onOpenPost} />
        ))
      )}
      <ConfirmSheet
        visible={confirmBlock}
        title={copy.profile.blockConfirmTitle}
        body={copy.profile.blockConfirmBody(displayHandle)}
        confirmLabel={copy.profile.block}
        danger
        onCancel={() => setConfirmBlock(false)}
        onConfirm={() => {
          setConfirmBlock(false);
          onBlock();
        }}
      />
    </Screen>
  );
}
