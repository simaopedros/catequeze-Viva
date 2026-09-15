import React, { useState } from 'react';
import { Alert, Image, Linking, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { SocialPost, SocialReportReason } from '../api/types';
import { Avatar } from './ui';
import { publicPostUrl, REPORT_REASONS } from '../lib/social';
import { colors, fonts, spacing } from '../theme';

const LONG_BODY = 280;

export function ShareCard({
  title,
  subtitle,
  excerpt,
  kind,
  ink = false,
  onPress,
}: {
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  kind?: string | null;
  ink?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.share, ink && styles.shareInk]}
      testID="share-card"
    >
      {kind ? <Text style={[styles.shareKind, ink && { color: colors.gold }]}>{kind}</Text> : null}
      <Text style={[styles.shareTitle, ink && { color: colors.cream }]}>{title}</Text>
      {subtitle ? <Text style={styles.shareSubtitle}>{subtitle}</Text> : null}
      {excerpt ? (
        <Text style={[styles.shareExcerpt, ink && { color: colors.cream }]}>{excerpt}</Text>
      ) : null}
    </Pressable>
  );
}

export function PostCard({
  post,
  onOpenAuthor,
  onOpenPost,
  onReact,
  onComment,
  onDelete,
  onReport,
}: {
  post: SocialPost;
  onOpenAuthor?: (handle: string) => void;
  onOpenPost?: (slug: string) => void;
  onReact?: (type: 'AMEM' | 'REZO' | 'ALELUIA') => void;
  onComment?: (body: string) => void;
  onDelete?: (postId: string) => void;
  onReport?: (reason: SocialReportReason) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [comment, setComment] = useState('');
  const [showReport, setShowReport] = useState(false);
  const long = (post.body || '').length > LONG_BODY;
  const body = !long || expanded ? post.body : `${post.body.slice(0, LONG_BODY).trimEnd()}…`;
  const handle = post.author.handle || post.author.socialHandle;
  const media = post.media || [];

  async function copyLink() {
    const url = publicPostUrl(post.slug);
    await Clipboard.setStringAsync(url);
    Alert.alert('Link copiado', url);
  }

  function shareWhatsApp() {
    const url = publicPostUrl(post.slug);
    void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(url)}`);
  }

  return (
    <View style={styles.card} testID={`post-card-${post.id}`}>
      <Pressable
        accessibilityRole="button"
        testID={`post-author-${post.id}`}
        onPress={() => handle && onOpenAuthor?.(handle)}
        disabled={!handle}
        style={styles.authorRow}
      >
        <Avatar name={post.author.displayName} uri={post.author.avatarUrl} size={40} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.author}>{post.author.displayName}</Text>
          {handle ? <Text style={styles.handle}>@{handle}</Text> : null}
          {post.topics?.length ? (
            <Text style={styles.topics}>{post.topics.map((topic) => topic.name).join(' · ')}</Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        testID={`post-${post.id}`}
        onPress={() => post.slug && onOpenPost?.(post.slug)}
        disabled={!onOpenPost}
      >
        {post.body ? <Text style={styles.body}>{body}</Text> : null}
      </Pressable>
      {media.length > 0 ? (
        <View testID={`post-gallery-${post.id}`}>
          {media.map((item) =>
            item.kind === 'VIDEO' || item.url?.match(/\.mp4|video/i) ? (
              <Text key={item.id} style={styles.more}>
                Vídeo
              </Text>
            ) : item.url ? (
              <Image key={item.id} source={{ uri: item.url }} style={styles.image} />
            ) : null,
          )}
        </View>
      ) : null}
      {long ? (
        <Pressable onPress={() => setExpanded((value) => !value)} testID={`post-expand-${post.id}`}>
          <Text style={styles.more}>{expanded ? 'Ver menos' : 'Ver mais'}</Text>
        </Pressable>
      ) : null}
      {post.share ? (
        <ShareCard
          kind={post.share.sourceLabel || post.share.kind}
          title={post.share.title}
          subtitle={post.share.subtitle}
          excerpt={post.share.excerpt}
          onPress={() => post.slug && onOpenPost?.(post.slug)}
        />
      ) : null}
      {onOpenPost && post.slug ? (
        <Pressable testID={`open-post-${post.id}`} onPress={() => onOpenPost(post.slug)}>
          <Text style={styles.more}>Abrir publicação</Text>
        </Pressable>
      ) : null}
      <View style={styles.reactions}>
        {(['AMEM', 'REZO', 'ALELUIA'] as const).map((type) => (
          <Pressable
            key={type}
            testID={`react-${type}-${post.id}`}
            onPress={() => onReact?.(type)}
            style={[styles.react, post.viewerReaction === type && styles.reactOn]}
          >
            <Text style={[styles.reactLabel, post.viewerReaction === type && { color: colors.white }]}>
              {type === 'AMEM' ? 'Amém' : type === 'REZO' ? 'Rezo' : 'Aleluia'}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.meta}>
        {post.reactionCount ?? 0} reações · {post.commentCount ?? 0} comentários
      </Text>
      {onComment ? (
        <View style={{ marginTop: spacing.sm }}>
          <TextInput
            testID={`comment-input-${post.id}`}
            value={comment}
            onChangeText={setComment}
            placeholder="Escreva um comentário..."
            placeholderTextColor={colors.muted}
            style={styles.commentInput}
          />
          <Pressable
            testID={`comment-submit-${post.id}`}
            onPress={() => {
              if (!comment.trim()) return;
              onComment(comment.trim());
              setComment('');
            }}
          >
            <Text style={styles.more}>Comentar</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: spacing.sm }}>
        <Pressable testID={`copy-link-${post.id}`} onPress={() => void copyLink()}>
          <Text style={styles.more}>Copiar link</Text>
        </Pressable>
        <Pressable testID={`whatsapp-${post.id}`} onPress={shareWhatsApp}>
          <Text style={styles.more}>WhatsApp</Text>
        </Pressable>
        <Pressable
          testID={`share-native-${post.id}`}
          onPress={() => void Share.share({ message: publicPostUrl(post.slug) })}
        >
          <Text style={styles.more}>Compartilhar</Text>
        </Pressable>
        {post.isOwn && onDelete ? (
          <Pressable
            testID={`delete-post-${post.id}`}
            onPress={() =>
              Alert.alert('Apagar publicação', 'Esta publicação sai da Comunidade.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Apagar', style: 'destructive', onPress: () => onDelete(post.id) },
              ])
            }
          >
            <Text style={[styles.more, { color: colors.danger }]}>Apagar</Text>
          </Pressable>
        ) : null}
        {onReport && !post.isOwn ? (
          <Pressable testID={`report-toggle-${post.id}`} onPress={() => setShowReport((value) => !value)}>
            <Text style={styles.more}>Denunciar</Text>
          </Pressable>
        ) : null}
      </View>
      {showReport && onReport ? (
        <View style={{ marginTop: spacing.sm }}>
          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason.id}
              testID={`report-reason-${reason.id}-${post.id}`}
              onPress={() => {
                onReport(reason.id);
                setShowReport(false);
              }}
              style={{ minHeight: 40, justifyContent: 'center' }}
            >
              <Text style={{ color: colors.inkSoft, fontFamily: fonts.sans }}>{reason.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  author: { color: colors.ink, fontFamily: fonts.sansBold, fontSize: 16 },
  handle: { color: colors.goldDark, marginTop: 2, fontFamily: fonts.sansMedium },
  topics: { color: colors.muted, marginTop: 2, fontFamily: fonts.sansMedium, fontSize: 12 },
  body: { color: colors.inkSoft, fontSize: 16, lineHeight: 23, fontFamily: fonts.sans },
  more: { color: colors.goldDark, fontFamily: fonts.sansBold, marginTop: 8 },
  meta: { color: colors.muted, fontSize: 13, fontFamily: fonts.sansMedium, marginTop: 8 },
  image: { width: '100%', height: 220, borderRadius: 16, marginTop: 10, backgroundColor: colors.canvas },
  share: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
  },
  shareInk: { backgroundColor: colors.ink, borderColor: colors.inkSoft },
  shareKind: { color: colors.goldDark, fontFamily: fonts.sansBold, fontSize: 12, marginBottom: 4 },
  shareTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 18 },
  shareSubtitle: { color: colors.muted, marginTop: 2 },
  shareExcerpt: { color: colors.inkSoft, marginTop: 6, lineHeight: 20, fontFamily: fonts.serifRegular },
  reactions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm, flexWrap: 'wrap' },
  react: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
  },
  reactOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  reactLabel: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13 },
  commentInput: {
    minHeight: 40,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    color: colors.ink,
    fontFamily: fonts.sans,
  },
});
