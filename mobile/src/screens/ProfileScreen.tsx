import React from 'react';
import { Text } from 'react-native';
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

  return (
    <Screen testID="profile-screen">
      <ScreenTitle title={data.displayName} subtitle={data.handle ? `@${data.handle}` : 'Sem handle público'} />
      {data.bio ? <Text style={{ color: colors.inkSoft, marginBottom: 12 }}>{data.bio}</Text> : null}
      <Text style={{ color: colors.muted, marginBottom: 16 }}>
        {data.followersCount ?? data.followerCount ?? 0} seguidores · {data.followingCount ?? 0} a seguir
      </Text>
      {!data.isOwn ? (
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
      ) : (
        <Text style={{ color: colors.muted }}>Este é o seu perfil público.</Text>
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
