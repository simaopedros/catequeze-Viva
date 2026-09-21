import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageBubble, MessageComposer } from '../components/pastoralUi';
import { EmptyState, LoadingState } from '../components/ui';
import { colors, spacing, typography } from '../theme';

function isMineMessage(message: any, data: any) {
  if (message.mine || message.isOwn) return true;
  const viewerId = data?.viewerId || data?.currentUserId;
  const authorId = message.author?.id || message.senderId;
  return viewerId && authorId && viewerId === authorId;
}

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
  const title = data?.title || data?.name || 'Conversa';

  return (
    <SafeAreaView testID="thread-screen" style={{ flex: 1, backgroundColor: colors.canvas }} edges={['left', 'right']}>
      <View style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ ...typography.headingSm, color: colors.text.primary }}>{title}</Text>
      </View>
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Conversa indisponível" body={error} /> : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[6] }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message: any) => {
          const body = message.content || message.body || '';
          const mine = isMineMessage(message, data);
          return (
            <MessageBubble
              key={message.id}
              body={body}
              mine={mine}
              author={mine ? undefined : message.author?.displayName || message.senderName || 'Membro'}
            />
          );
        })}
      </ScrollView>
      <MessageComposer
        testID="message-input"
        value={content}
        onChangeText={setContent}
        busy={busy}
        onSend={async () => {
          await onSend(content.trim());
          setContent('');
        }}
      />
    </SafeAreaView>
  );
}
