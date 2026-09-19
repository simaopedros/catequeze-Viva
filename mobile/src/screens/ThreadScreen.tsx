import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { BrandButton, Card, EmptyState, ErrorText, Field, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors, spacing } from '../theme';

export function ThreadScreen({
  data,
  loading,
  error,
  onSend,
  busy,
  sendError,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onSend: (content: string) => Promise<void> | void;
  busy?: boolean;
  sendError?: string | null;
}) {
  const [content, setContent] = useState('');
  const messages = data?.messages || data?.items || [];

  return (
    <Screen testID="thread-screen">
      <ScreenTitle title={data?.title || data?.name || 'Conversa'} />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Conversa indisponível" body={error} /> : null}
      {messages.map((message: any) => {
        const authorName =
          message.author?.displayName ||
          message.senderName ||
          [message.sender?.firstName, message.sender?.lastName].filter(Boolean).join(' ') ||
          'Membro';
        const avatarUrl = message.author?.avatarUrl || message.sender?.avatarUrl || null;
        return (
          <Card key={message.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Avatar name={authorName} url={avatarUrl} size={32} />
              <Text style={{ color: colors.goldDark, fontWeight: '700' }}>{authorName}</Text>
            </View>
            <Text style={{ color: colors.inkSoft, marginTop: 6 }}>{message.content || message.body}</Text>
          </Card>
        );
      })}
      <ErrorText message={sendError} />
      <Field label="Mensagem" value={content} onChangeText={setContent} testID="message-input" />
      <BrandButton
        label={busy ? 'A enviar…' : 'Enviar'}
        disabled={busy || !content.trim()}
        onPress={async () => {
          try {
            await onSend(content.trim());
            setContent('');
          } catch {
            // o erro é apresentado via sendError; o texto fica no campo
          }
        }}
      />
    </Screen>
  );
}
