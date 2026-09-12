import React, { useState } from 'react';
import { Text } from 'react-native';
import { BrandButton, Card, EmptyState, Field, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors } from '../theme';

export function ThreadScreen({
  data,
  loading,
  error,
  onSend,
  busy,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onSend: (content: string) => Promise<void> | void;
  busy?: boolean;
}) {
  const [content, setContent] = useState('');
  const messages = data?.messages || data?.items || [];

  return (
    <Screen testID="thread-screen">
      <ScreenTitle title={data?.title || data?.name || 'Conversa'} />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Conversa indisponível" body={error} /> : null}
      {messages.map((message: any) => (
        <Card key={message.id}>
          <Text style={{ color: colors.goldDark, fontWeight: '700' }}>
            {message.author?.displayName || message.senderName || 'Membro'}
          </Text>
          <Text style={{ color: colors.inkSoft, marginTop: 6 }}>{message.content || message.body}</Text>
        </Card>
      ))}
      <Field label="Mensagem" value={content} onChangeText={setContent} testID="message-input" />
      <BrandButton
        label={busy ? 'Enviando…' : 'Enviar'}
        disabled={busy || !content.trim()}
        onPress={async () => {
          await onSend(content.trim());
          setContent('');
        }}
      />
    </Screen>
  );
}
