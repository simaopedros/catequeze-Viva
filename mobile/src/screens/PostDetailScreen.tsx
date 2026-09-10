import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { SocialAccess, SocialComment, SocialPost, SocialReportReason } from '../api/types';
import { PostCard } from '../components/PostCard';
import { BrandButton, EmptyState, Field, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors, spacing } from '../theme';

const REACTIONS = [
  { id: 'AMEM' as const, label: 'Amém' },
  { id: 'REZO' as const, label: 'Rezo' },
  { id: 'ALELUIA' as const, label: 'Aleluia' },
];

const REPORT_REASONS: { id: SocialReportReason; label: string }[] = [
  { id: 'DOCTRINE', label: 'Doutrina' },
  { id: 'HATE', label: 'Ódio' },
  { id: 'SPAM', label: 'Spam' },
  { id: 'OTHER', label: 'Outro' },
];

export function PostDetailScreen({
  post,
  comments,
  access,
  loading,
  error,
  busy,
  onOpenAuthor,
  onReact,
  onComment,
  onReport,
  reportMessage,
}: {
  post?: SocialPost | null;
  comments: SocialComment[];
  access?: SocialAccess | null;
  loading?: boolean;
  error?: string | null;
  busy?: boolean;
  onOpenAuthor: (handle: string) => void;
  onReact: (type: 'AMEM' | 'REZO' | 'ALELUIA') => void;
  onComment: (body: string) => Promise<void> | void;
  onReport?: (reason: SocialReportReason) => Promise<void> | void;
  reportMessage?: string | null;
}) {
  const [body, setBody] = useState('');
  const [reason, setReason] = useState<SocialReportReason>('OTHER');

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

  return (
    <Screen testID="post-screen">
      <ScreenTitle title="Publicação" subtitle={post.topics?.map((topic) => topic.name).join(' · ') || 'Comunidade'} />
      <PostCard post={post} onOpenAuthor={onOpenAuthor} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md, flexWrap: 'wrap' }}>
        {REACTIONS.map((item) => (
          <Pressable
            key={item.id}
            testID={`react-${item.id}`}
            onPress={() => onReact(item.id)}
            disabled={busy}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: post.viewerReaction === item.id ? colors.ink : colors.paper,
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <Text style={{ color: post.viewerReaction === item.id ? colors.white : colors.ink, fontWeight: '600' }}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 18, marginBottom: spacing.sm }}>Comentários</Text>
      {comments.length === 0 ? (
        <EmptyState title="Ainda sem comentários" body="Seja o primeiro a responder com um Amém ou uma palavra." />
      ) : (
        comments.map((comment) => (
          <View key={comment.id} testID={`comment-${comment.id}`} style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>{comment.author.displayName}</Text>
            {comment.author.handle || comment.author.socialHandle ? (
              <Text style={{ color: colors.goldDark, marginBottom: 4 }}>
                @{comment.author.handle || comment.author.socialHandle}
              </Text>
            ) : null}
            <Text style={{ color: colors.inkSoft, lineHeight: 22 }}>{comment.body}</Text>
          </View>
        ))
      )}
      {access && !access.canPublish ? (
        <Text style={{ color: colors.goldDark, marginBottom: spacing.sm }}>
          Comentários pedem a mesma conta com que lê a Comunidade.
        </Text>
      ) : null}
      <Field label="O seu comentário" value={body} onChangeText={setBody} multiline testID="comment-input" />
      <BrandButton
        testID="comment-submit"
        label={busy ? 'A enviar…' : 'Comentar'}
        disabled={busy || !body.trim()}
        onPress={async () => {
          await onComment(body.trim());
          setBody('');
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
                onPress={() => setReason(item.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: reason === item.id ? colors.ink : colors.paper,
                  borderWidth: 1,
                  borderColor: colors.line,
                }}
              >
                <Text style={{ color: reason === item.id ? colors.white : colors.ink, fontWeight: '600' }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {reportMessage ? <Text style={{ color: colors.success, marginBottom: spacing.sm }}>{reportMessage}</Text> : null}
          <BrandButton
            variant="ghost"
            testID="report-submit"
            label={busy ? 'A enviar…' : 'Enviar denúncia'}
            disabled={busy}
            onPress={() => onReport(reason)}
          />
        </View>
      ) : null}
    </Screen>
  );
}
