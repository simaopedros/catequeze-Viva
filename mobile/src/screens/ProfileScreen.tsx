import React from 'react';
import { Pressable, Text } from 'react-native';
import { BrandButton, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { PostCard } from '../components/PostCard';
import type { SocialPost, SocialProfile } from '../api/types';
import { colors } from '../theme';

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
        <EmptyState title="Perfil indisponível" body={error || 'Este @ não foi encontrado.'} />
      </Screen>
    );
  }

  const handle = data.handle || data.socialHandle;
  const followers = data.followersCount ?? data.followerCount ?? 0;
  const following = data.followingCount ?? 0;

  return (
    <Screen testID="profile-screen">
      <ScreenTitle title={data.displayName} subtitle={handle ? `@${handle}` : 'Sem handle público'} />
      {data.bio || data.socialBio ? (
        <Text style={{ color: colors.inkSoft, marginBottom: 12 }}>{data.bio || data.socialBio}</Text>
      ) : null}
      {data.websiteUrl ? (
        <Text style={{ color: colors.goldDark, marginBottom: 12 }}>{data.websiteUrl}</Text>
      ) : null}
      <Pressable testID="open-followers" onPress={onOpenFollowers} disabled={!onOpenFollowers}>
        <Text style={{ color: colors.muted, marginBottom: 8 }}>
          <Text style={{ color: colors.ink, fontWeight: '700' }}>{followers}</Text> seguidores
        </Text>
      </Pressable>
      <Pressable testID="open-following" onPress={onOpenFollowing} disabled={!onOpenFollowing}>
        <Text style={{ color: colors.muted, marginBottom: 16 }}>
          <Text style={{ color: colors.ink, fontWeight: '700' }}>{following}</Text> a seguir
        </Text>
      </Pressable>
      {data.isOwn ? (
        <>
          <Text style={{ color: colors.muted, marginBottom: 8 }}>Este é o seu perfil público.</Text>
          {onEdit ? <BrandButton label="Editar perfil" onPress={onEdit} testID="edit-own-profile" /> : null}
        </>
      ) : (
        <>
          <BrandButton
            testID="follow-button"
            label={data.isFollowing ? 'A seguir' : 'Seguir'}
            onPress={onFollow}
            disabled={busy || data.isBlocked}
          />
          <BrandButton
            testID="block-button"
            variant={data.isBlocked ? 'ghost' : 'danger'}
            label={data.isBlocked ? 'Desbloquear' : 'Bloquear'}
            onPress={onBlock}
            disabled={busy}
          />
        </>
      )}
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 18, marginTop: 20, marginBottom: 8 }}>
        Publicações
      </Text>
      {(posts ?? []).length === 0 ? (
        <EmptyState title="Ainda sem publicações" body="Quando este perfil publicar, as mensagens aparecem aqui." />
      ) : (
        (posts ?? []).map((post) => (
          <PostCard key={post.id} post={post} onOpenAuthor={onOpenAuthor} onOpenPost={onOpenPost} />
        ))
      )}
    </Screen>
  );
}
