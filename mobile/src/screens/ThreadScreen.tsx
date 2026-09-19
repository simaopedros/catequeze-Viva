import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from 'react-native-paper';
import { Avatar } from '../components/Avatar';
import { EmptyState, ErrorText, Icon, SkeletonList } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { formatRelative, fullName } from '../utils/format';

function authorOf(message: any): { name: string; avatarUrl?: string | null; id?: string } {
  const name =
    message.author?.displayName || message.senderName || fullName(message.sender, '') || fullName(message.author, '') || 'Membro';
  return { name, avatarUrl: message.author?.avatarUrl || message.sender?.avatarUrl || null, id: message.senderId || message.sender?.id || message.author?.id };
}

export function ThreadScreen({
  data,
  loading,
  error,
  onSend,
  busy,
  sendError,
  currentUserId,
  onOpenInfo,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onSend: (content: string) => Promise<void> | void;
  busy?: boolean;
  sendError?: string | null;
  currentUserId?: string | null;
  onOpenInfo?: () => void;
}) {
  const [content, setContent] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const messages: any[] = data?.messages || data?.items || [];

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    return () => clearTimeout(timer);
  }, [messages.length]);

  async function submit() {
    const trimmed = content.trim();
    if (!trimmed || busy) return;
    try {
      await onSend(trimmed);
      setContent('');
    } catch {
      // o erro é apresentado via sendError; o texto fica no campo
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.cream }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : insets.top + 56}
    >
      <View testID="thread-screen" style={{ flex: 1 }}>
        {onOpenInfo ? (
          <Pressable onPress={onOpenInfo} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.surface }} testID="thread-info">
            <Icon name="information-outline" size={18} color={colors.muted} />
            <Text variant="labelMedium" style={{ color: colors.muted }}>
              {data?.participants?.length ? `${data.participants.length} participantes` : 'Detalhes da conversa'}
            </Text>
          </Pressable>
        ) : null}
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.lg }} keyboardShouldPersistTaps="handled">
          {loading && messages.length === 0 ? <SkeletonList rows={3} /> : null}
          {error ? <EmptyState icon="cloud-off-outline" title="Conversa indisponível" body={error} /> : null}
          {!loading && !error && messages.length === 0 ? (
            <EmptyState icon="message-outline" title="Ainda sem mensagens" body="Escreva a primeira mensagem abaixo." />
          ) : null}
          {messages.map((message: any, index: number) => {
            const author = authorOf(message);
            const mine = Boolean(currentUserId && author.id === currentUserId);
            const previous = messages[index - 1];
            const sameAuthor = previous && authorOf(previous).id === author.id;
            return (
              <View key={message.id} style={{ flexDirection: 'row', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 6, marginTop: sameAuthor ? 0 : spacing.sm }}>
                {!mine ? <View style={{ width: 30 }}>{!sameAuthor ? <Avatar name={author.name} url={author.avatarUrl} size={30} /> : null}</View> : null}
                <View style={{ maxWidth: '78%' }}>
                  {!mine && !sameAuthor ? (
                    <Text variant="labelSmall" style={{ color: colors.goldDark, marginBottom: 2, marginLeft: 4 }}>
                      {author.name}
                    </Text>
                  ) : null}
                  <View
                    style={{
                      backgroundColor: mine ? colors.ink : colors.surface,
                      borderWidth: mine ? 0 : 1,
                      borderColor: colors.line,
                      borderRadius: radius.lg,
                      borderBottomRightRadius: mine ? 4 : radius.lg,
                      borderBottomLeftRadius: mine ? radius.lg : 4,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text variant="bodyMedium" style={{ color: mine ? colors.white : colors.ink }}>
                      {message.content || message.body}
                    </Text>
                    <Text variant="labelSmall" style={{ color: mine ? colors.tabInactive : colors.muted, marginTop: 4, alignSelf: 'flex-end' }}>
                      {formatRelative(message.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
        <View style={{ padding: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line }}>
          <ErrorText message={sendError} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs }}>
            <TextInput
              testID="message-input"
              mode="outlined"
              placeholder="Escreva uma mensagem…"
              value={content}
              onChangeText={setContent}
              multiline
              dense
              style={{ flex: 1, backgroundColor: colors.surface, maxHeight: 120 }}
              outlineStyle={{ borderRadius: radius.lg, borderColor: colors.line }}
              activeOutlineColor={colors.ink}
              onSubmitEditing={submit}
            />
            <Pressable
              testID="send-message"
              accessibilityRole="button"
              accessibilityLabel="Enviar"
              disabled={busy || !content.trim()}
              onPress={() => void submit()}
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: busy || !content.trim() ? colors.line : colors.gold,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <Icon name="send" size={20} color={colors.ink} />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
