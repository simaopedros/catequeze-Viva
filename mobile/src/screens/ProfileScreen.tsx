import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BrandButton, Card, EmptyState, ErrorText, Icon, Row, Screen, SectionHeader, SkeletonList, Tag } from '../components/ui';
import { Avatar } from '../components/Avatar';
import { PostCard } from '../components/PostCard';
import type { SocialPost, SocialProfile } from '../api/types';
import { colors, spacing } from '../theme';

function Counter({ value, label, onPress, testID }: { value: number; label: string; onPress?: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} disabled={!onPress} style={{ alignItems: 'center', flex: 1 }}>
      <Text variant="titleLarge" style={{ color: colors.white }}>
        {value}
      </Text>
      <Text variant="labelSmall" style={{ color: colors.tabInactive }}>
        {label}
      </Text>
    </Pressable>
  );
}

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
  onReport,
  actionError,
  postsHasMore,
  postsLoadingMore,
  onLoadMorePosts,
  refreshing,
  onRefresh,
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
  onReport?: () => void;
  actionError?: string | null;
  postsHasMore?: boolean;
  postsLoadingMore?: boolean;
  onLoadMorePosts?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const data: any = profile?.profile ?? profile;
  if (loading && !data) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen>
        <EmptyState icon="account-question-outline" title="Perfil indisponível" body={error || 'Este @ não foi encontrado.'} />
      </Screen>
    );
  }

  const handle = data.handle || data.socialHandle;
  const followers = data.followersCount ?? data.followerCount ?? 0;
  const following = data.followingCount ?? 0;
  const postCount = data.postsCount ?? data.postCount ?? (posts ?? []).length;

  return (
    <Screen testID="profile-screen" refreshing={refreshing} onRefresh={onRefresh}>
      <Card tone="ink">
        <View style={{ alignItems: 'center' }}>
          <View style={{ borderWidth: 3, borderColor: colors.gold, borderRadius: 50, padding: 3 }}>
            <Avatar name={data.displayName} url={data.avatarUrl} size={88} testID="profile-avatar" />
          </View>
          <Text variant="headlineSmall" style={{ color: colors.white, marginTop: spacing.sm }}>
            {data.displayName}
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.goldLight }}>
            {handle ? `@${handle}` : 'Sem handle público'}
          </Text>
          {data.isOwn ? <View style={{ marginTop: 6 }}><Tag label="O seu perfil" tone="gold" icon="account-check-outline" /></View> : null}
          {data.isBlocked ? <View style={{ marginTop: 6 }}><Tag label="Bloqueado" tone="danger" icon="account-cancel-outline" /></View> : null}
        </View>
        {data.bio || data.socialBio ? (
          <Text variant="bodyMedium" style={{ color: colors.cream, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 }}>
            {data.bio || data.socialBio}
          </Text>
        ) : null}
        {data.websiteUrl ? (
          <Row style={{ justifyContent: 'center', marginTop: spacing.xs }}>
            <Icon name="link-variant" size={14} color={colors.goldLight} />
            <Text variant="labelMedium" style={{ color: colors.goldLight }}>
              {data.websiteUrl}
            </Text>
          </Row>
        ) : null}
        <Row style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.inkSoft, paddingTop: spacing.sm }}>
          <Counter value={postCount} label="publicações" />
          <Counter value={followers} label="seguidores" onPress={onOpenFollowers} testID="open-followers" />
          <Counter value={following} label="a seguir" onPress={onOpenFollowing} testID="open-following" />
        </Row>
      </Card>

      {data.isOwn ? (
        onEdit ? <BrandButton icon="account-edit-outline" label="Editar perfil" onPress={onEdit} testID="edit-own-profile" /> : null
      ) : (
        <>
          <ErrorText message={actionError} />
          <Row>
            <BrandButton
              testID="follow-button"
              variant={data.isFollowing ? 'ghost' : 'gold'}
              icon={data.isFollowing ? 'account-check-outline' : 'account-plus-outline'}
              label={data.isFollowing ? 'A seguir' : 'Seguir'}
              onPress={onFollow}
              disabled={busy || data.isBlocked}
              style={{ flex: 1 }}
            />
            <BrandButton
              testID="block-button"
              variant={data.isBlocked ? 'ghost' : 'text'}
              icon={data.isBlocked ? 'account-check-outline' : 'account-cancel-outline'}
              label={data.isBlocked ? 'Desbloquear' : 'Bloquear'}
              onPress={onBlock}
              disabled={busy}
              style={{ flex: 1 }}
            />
          </Row>
          {onReport ? <BrandButton variant="text" icon="flag-outline" label="Reportar perfil" onPress={onReport} /> : null}
        </>
      )}

      <SectionHeader title="Publicações" icon="post-outline" />
      {(posts ?? []).length === 0 ? (
        <EmptyState icon="post-outline" title="Ainda sem publicações" body="Quando este perfil publicar, as mensagens aparecem aqui." />
      ) : (
        (posts ?? []).map((post) => <PostCard key={post.id} post={post} onOpenAuthor={onOpenAuthor} onOpenPost={onOpenPost} />)
      )}
      {postsHasMore && onLoadMorePosts ? (
        <BrandButton variant="ghost" testID="load-more-posts" label={postsLoadingMore ? 'A carregar…' : 'Carregar mais'} disabled={postsLoadingMore} loading={postsLoadingMore} onPress={onLoadMorePosts} />
      ) : null}
    </Screen>
  );
}
