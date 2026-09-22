import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PostCommentComposer } from '../components/postCommentsUi';
import { MessageBubble } from '../components/pastoralUi';
import { EmptyState, LoadingState } from '../components/ui';
import { useKeyboardOffset } from '../hooks/useKeyboardOffset';
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
  const [composerHeight, setComposerHeight] = useState(72);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();
  const messages = threadMessages(data);
  const keyboardOpen = keyboardOffset > 0;
  const scrollBottomInset =
    composerHeight + spacing[4] + (keyboardOpen ? keyboardOffset : Math.max(insets.bottom, spacing[2]));

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [messages.length, data]);

  useEffect(() => {
    if (!keyboardOpen) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [keyboardOpen, keyboardOffset]);

  return (
    <SafeAreaView testID="thread-screen" style={styles.root} edges={['left', 'right']}>
      <View style={styles.flex}>
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
              { paddingBottom: scrollBottomInset },
              messages.length === 0 && styles.messageListEmpty,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
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
          <View
            onLayout={(event) => {
              const next = event.nativeEvent.layout.height;
              if (next > 0 && Math.abs(next - composerHeight) > 1) {
                setComposerHeight(next);
              }
            }}
            style={[
              styles.composerBar,
              {
                paddingBottom: keyboardOpen ? spacing[2] : Math.max(insets.bottom, spacing[2]),
                bottom: keyboardOffset,
              },
            ]}
          >
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
      </View>
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
  composerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
});
