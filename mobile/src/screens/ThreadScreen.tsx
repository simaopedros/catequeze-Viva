import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ChatBubble, ChatComposer, EmptyState, LoadingState, ScreenTitle } from '../components/ui';
import { asItems, formatTime, personName } from '../lib/payload';
import { colors } from '../theme';

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
  const conversation = data?.conversation || data;
  const messages = asItems(data?.messages).length ? asItems(data?.messages) : asItems(data);

  return (
    <View testID="thread-screen" style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <ScreenTitle title={conversation?.title || conversation?.name || 'Conversa'} />
      </View>
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Conversa indisponível" body={error} /> : null}
      {!loading && !error && messages.length === 0 ? (
        <EmptyState title="Ainda sem mensagens" body="Escreva a primeira palavra desta conversa." />
      ) : null}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
        {messages.map((message: any) => {
          const sender = message.sender || message.author || message;
          const senderId = sender.id || message.senderId || message.userId;
          const mine = Boolean(currentUserId && senderId && senderId === currentUserId);
          return (
            <ChatBubble
              key={message.id}
              mine={mine}
              author={personName(sender, 'Membro')}
              body={message.content || message.body || ''}
              time={formatTime(message.createdAt)}
            />
          );
        })}
      </ScrollView>
      <ChatComposer
        value={content}
        onChangeText={setContent}
        busy={busy}
        onSend={async () => {
          await onSend(content.trim());
          setContent('');
        }}
      />
    </View>
  );
}
