import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { SocialAccess, SocialComment, SocialPost, SocialReportReason } from '../api/types';
import { PostCard } from '../components/PostCard';
import { BrandButton, EmptyState, Field, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { REPORT_REASONS } from '../lib/social';
import { colors, fonts, spacing } from '../theme';

export function PostDetailScreen({
  post,
  comments,
  access,
  loading,
  error,
  busy,
  heldMessage,
  onOpenAuthor,
  onReact,
  onComment,
  onDelete,
  onReport,
  reportMessage,
}: {
  post?: SocialPost | null;
  comments: SocialComment[];
  access?: SocialAccess | null;
  loading?: boolean;
  error?: string | null;
  busy?: boolean;
  heldMessage?: string | null;
  onOpenAuthor: (handle: string) => void;
  onReact: (type: 'AMEM' | 'REZO' | 'ALELUIA') => void;
  onComment: (body: string, parentId?: string | null) => Promise<void> | void;
  onDelete?: (postId: string) => void;
  onReport?: (reason: SocialReportReason) => Promise<void> | void;
  reportMessage?: string | null;
}) {
  const [body, setBody] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);

  if (loading) {
    return (
      <Screen testID="post-screen">
        <LoadingState />
      </Screen>
    );
  }
  if (error || !post) {
    return (
      <Screen testID="post-screen">
        <EmptyState title="Publicação indisponível" body={error || 'Esta publicação não foi encontrada.'} />
      </Screen>
    );
  }

  const parent = comments.find((comment) => comment.id === parentId);

  return (
    <Screen testID="post-screen">
      <ScreenTitle title="Publicação" subtitle={post.topics?.map((topic) => topic.name).join(' · ') || 'Comunidade'} />
      <PostCard
        post={post}
        onOpenAuthor={onOpenAuthor}
        onReact={onReact}
        onDelete={onDelete}
        onReport={onReport}
      />
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 18, marginBottom: spacing.sm }}>Comentários</Text>
      {heldMessage ? (
        <Text testID="comment-held" style={{ color: colors.goldDark, marginBottom: spacing.sm }}>
          {heldMessage}
        </Text>
      ) : null}
      {comments.length === 0 ? (
        <EmptyState title="Ainda sem comentários" body="Seja o primeiro a responder com um Amém ou uma palavra." />
      ) : (
        comments.map((comment) => (
          <View key={comment.id} testID={`comment-${comment.id}`} style={{ marginBottom: spacing.md, marginLeft: comment.parentId ? 16 : 0 }}>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>{comment.author.displayName}</Text>
            {comment.author.handle || comment.author.socialHandle ? (
              <Text style={{ color: colors.goldDark, marginBottom: 4 }}>
                @{comment.author.handle || comment.author.socialHandle}
              </Text>
            ) : null}
            <Text style={{ color: colors.inkSoft, lineHeight: 22 }}>{comment.body}</Text>
            {comment.held ? (
              <Text style={{ color: colors.goldDark, marginTop: 4 }}>A aguardar revisão.</Text>
            ) : null}
            <Pressable testID={`reply-${comment.id}`} onPress={() => setParentId(comment.id)}>
              <Text style={{ color: colors.goldDark, fontFamily: fonts.sansSemi, marginTop: 6 }}>Responder</Text>
            </Pressable>
          </View>
        ))
      )}
      {access && !access.canPublish ? (
        <Text style={{ color: colors.goldDark, marginBottom: spacing.sm }}>
          Comentários pedem a mesma conta com que lê a Comunidade.
        </Text>
      ) : null}
      {parent ? (
        <Text testID="replying-to" style={{ color: colors.muted, marginBottom: 8 }}>
          A responder a {parent.author.displayName}
        </Text>
      ) : null}
      <Field label="O seu comentário" value={body} onChangeText={setBody} multiline testID="comment-input" />
      <BrandButton
        testID="comment-submit"
        label={busy ? 'Enviando…' : parent ? 'Responder' : 'Comentar'}
        disabled={busy || !body.trim()}
        onPress={async () => {
          await onComment(body.trim(), parentId);
          setBody('');
          setParentId(null);
        }}
      />
      {onReport ? (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={{ color: colors.ink, fontWeight: '700', marginBottom: spacing.sm }}>Denunciar</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm }}>
            {REPORT_REASONS.map((item) => (
              <Pressable
                key={item.id}
                testID={`report-reason-${item.id}`}
                onPress={() => onReport(item.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: colors.paper,
                  borderWidth: 1,
                  borderColor: colors.line,
                }}
              >
                <Text style={{ color: colors.ink, fontWeight: '600', fontSize: 12 }}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          {reportMessage ? <Text style={{ color: colors.success, marginBottom: spacing.sm }}>{reportMessage}</Text> : null}
        </View>
      ) : null}
    </Screen>
  );
}
