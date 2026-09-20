import React, { useState } from 'react';
import { View } from 'react-native';
import { AppText, BrandButton, Card, EmptyState, ErrorState, Field, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { copy } from '../copy/ptBR';
import { colors, radius, spacing } from '../theme';

export function ThreadScreen({
  data,
  loading,
  error,
  onSend,
  busy,
  currentUserId,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onSend: (content: string) => Promise<void> | void;
  busy?: boolean;
  currentUserId?: string | null;
}) {
  const [content, setContent] = useState('');
  const messages = data?.messages || data?.items || [];

  return (
    <Screen testID="thread-screen">
      <ScreenTitle title={data?.title || data?.name || copy.messages.fallback} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.messages.threadError} body={error} /> : null}
      {messages.map((message: any) => {
        const mine =
          message.mine ||
          message.isOwn ||
          (currentUserId && (message.authorId === currentUserId || message.senderId === currentUserId));
        return (
          <View key={message.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
            <Card
              style={{
                maxWidth: '92%',
                backgroundColor: mine ? colors.goldSoft : colors.elevated,
                borderColor: mine ? colors.gold : colors.stroke,
                borderRadius: radius.md,
              }}
            >
              <AppText variant="caption" weight="bold" color="goldMuted">
                {message.author?.displayName || message.senderName || copy.messages.member}
              </AppText>
              <AppText variant="bodySm" color="inkSoft" style={{ marginTop: spacing.xs }}>
                {message.content || message.body}
              </AppText>
            </Card>
          </View>
        );
      })}
      <Field
        label={copy.messages.field}
        placeholder={copy.messages.placeholder}
        value={content}
        onChangeText={setContent}
        testID="message-input"
      />
      <BrandButton
        label={busy ? copy.common.sending : copy.common.send}
        disabled={busy || !content.trim()}
        onPress={async () => {
          await onSend(content.trim());
          setContent('');
        }}
      />
    </Screen>
  );
}
