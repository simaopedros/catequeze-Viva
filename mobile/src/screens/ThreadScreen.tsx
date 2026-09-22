import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PostCommentComposer } from '../components/postCommentsUi';
import { MessageBubble } from '../components/pastoralUi';
import { EmptyState, LoadingState } from '../components/ui';
import {
  formatMessageTime,
  isOwnMessage,
  messageAuthorLabel,
  messageBody,
  threadMessages,
} from '../messages/threadPresentation';
import { colors, spacing, typography } from '../theme';

export function ThreadScreen({
  data,
  loading,
  error,
  onSend,
  busy,
  viewerName,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onSend: (content: string) => Promise<void> | void;
  busy?: boolean;
  viewerName?: string;
}) {
  const [content, setContent] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const messages = threadMessages(data);

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [messages.length, data]);

  return (
    <SafeAreaView testID="thread-screen" style={styles.root} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {loading ? <LoadingState /> : null}
        {error ? (
          <View style={styles.centered}>
            <EmptyState title="Não foi possível abrir a conversa" body={error} />
          </View>
        ) : null}

        {!loading && !error ? (
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={[
              styles.messageList,
              messages.length === 0 && styles.messageListEmpty,
            ]}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>Nenhuma mensagem ainda</Text>
                <Text style={styles.emptyBody}>Envie a primeira mensagem abaixo.</Text>
              </View>
            ) : (
              messages.map((message: any) => {
                const body = messageBody(message);
                if (!body) return null;
                const mine = isOwnMessage(message, data);
                const time = formatMessageTime(message.createdAt || message.sentAt);
                return (
                  <MessageBubble
                    key={message.id}
                    body={body}
                    mine={mine}
                    time={time}
                    author={mine ? undefined : messageAuthorLabel(message)}
                  />
                );
              })
            )}
          </ScrollView>
        ) : null}

        {!error ? (
          <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, spacing[2]) }]}>
            <PostCommentComposer
              variant="footer"
              testID="message-input"
              submitTestID="message-send"
              placeholder="Mensagem…"
              viewerName={viewerName}
              value={content}
              onChangeText={setContent}
              busy={busy}
              onSubmit={async () => {
                const trimmed = content.trim();
                if (!trimmed) return;
                await onSend(trimmed);
                setContent('');
              }}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  flex: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  messageList: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    gap: spacing[2],
  },
  messageListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  emptyTitle: {
    ...typography.headingSm,
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.text.muted,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
});
