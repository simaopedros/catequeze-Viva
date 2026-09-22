import { SendHorizonal } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { SocialComment } from '../api/types';
import { Avatar } from './ui';
import { colors, radius, spacing } from '../theme';

export function PostCommentComposer({
  value,
  onChangeText,
  onSubmit,
  busy,
  disabled,
  viewerName,
  testID = 'comment-input',
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  disabled?: boolean;
  viewerName?: string;
  testID?: string;
}) {
  const canSend = !disabled && !busy && value.trim().length > 0;

  return (
    <View style={styles.composerRow} testID="post-comment-composer">
      <Avatar name={viewerName || 'Eu'} size={36} />
      <View style={styles.composerField}>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={disabled ? 'Entre para comentar' : 'Partilhe uma palavra…'}
          placeholderTextColor={colors.text.placeholder}
          style={styles.composerInput}
          multiline
          editable={!disabled && !busy}
          maxLength={2000}
        />
      </View>
      <Pressable
        testID="comment-submit"
        onPress={onSubmit}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Enviar comentário"
        style={({ pressed }) => [
          styles.sendButton,
          canSend && styles.sendButtonActive,
          pressed && canSend && { opacity: 0.88 },
        ]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <SendHorizonal size={18} color={canSend ? colors.white : colors.text.placeholder} strokeWidth={2.4} />
        )}
      </Pressable>
    </View>
  );
}

export function PostCommentItem({ comment }: { comment: SocialComment }) {
  const handle = comment.author.handle || comment.author.socialHandle;

  return (
    <View style={styles.commentRow} testID={`comment-${comment.id}`}>
      <Avatar name={comment.author.displayName} size={36} />
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor} numberOfLines={1}>{comment.author.displayName}</Text>
          {handle ? <Text style={styles.commentHandle} numberOfLines={1}>@{handle}</Text> : null}
        </View>
        <Text style={styles.commentText}>{comment.body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    marginBottom: spacing[4],
    paddingVertical: spacing[2],
  },
  composerField: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: radius.lg,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    justifyContent: 'center',
  },
  composerInput: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.text.primary,
    padding: 0,
    margin: 0,
    minHeight: 22,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButtonActive: {
    backgroundColor: colors.primary[800],
    borderColor: colors.primary[800],
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  commentBody: {
    flex: 1,
    minWidth: 0,
  },
  commentHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: spacing[2],
    marginBottom: 2,
  },
  commentAuthor: {
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  commentHandle: {
    color: colors.text.muted,
    fontSize: 13,
  },
  commentText: {
    color: colors.text.primary,
    lineHeight: 21,
    fontSize: 15,
  },
});
