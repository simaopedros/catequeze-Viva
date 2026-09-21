import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { BrandButton, ChatBubble, EmptyState, ErrorState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors, type } from '../theme';

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
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <Screen testID="thread-screen">
        <ScreenTitle title={data?.title || data?.name || 'Conversa'} />
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState title="Conversa indisponível" body={error} /> : null}
        {messages.map((message: any) => {
          const authorId = message.author?.id || message.senderId || message.userId;
          const mine = Boolean(currentUserId && authorId === currentUserId) || Boolean(message.mine);
          return (
            <ChatBubble
              key={message.id}
              mine={mine}
              author={message.author?.displayName || message.senderName || 'Membro'}
              body={message.content || message.body || ''}
            />
          );
        })}
        {!loading && messages.length === 0 ? (
          <EmptyState title="Conversa nova" body="Escreva a primeira mensagem aqui embaixo." />
        ) : null}
      </Screen>
      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.paper }}>
        <TextInput
          testID="message-input"
          value={content}
          onChangeText={setContent}
          placeholder="Mensagem"
          placeholderTextColor={colors.muted}
          style={{
            borderColor: colors.line,
            borderRadius: 0,
            borderBottomWidth: 1,
            paddingHorizontal: 0,
            minHeight: 48,
            color: colors.ink,
            fontFamily: type.body,
          }}
        />
        <BrandButton
          label={busy ? 'Enviando…' : 'Enviar'}
          disabled={busy || !content.trim()}
          onPress={async () => {
            await onSend(content.trim());
            setContent('');
          }}
        />
      </View>
    </View>
  );
}
