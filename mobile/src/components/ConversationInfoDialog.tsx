import React from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Dialog, Portal, Switch, Text } from 'react-native-paper';
import { Avatar } from './Avatar';
import { Row, Tag } from './ui';
import { colors, radius, spacing } from '../theme';
import { fullName } from '../utils/format';

export function ConversationInfoDialog({
  visible,
  conversation,
  currentUserId,
  muted,
  busy,
  onToggleMute,
  onLeave,
  onRemoveParticipant,
  onDismiss,
  canManage,
}: {
  visible: boolean;
  conversation: any;
  currentUserId?: string | null;
  muted: boolean;
  busy?: boolean;
  onToggleMute: (mute: boolean) => void;
  onLeave?: () => void;
  onRemoveParticipant?: (userId: string) => void;
  onDismiss: () => void;
  canManage?: boolean;
}) {
  const participants: any[] = conversation?.participants ?? [];
  const isGroup = conversation?.type === 'GROUP' || conversation?.type === 'CLASS' || participants.length > 2;
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, maxHeight: '80%' }}>
        <Dialog.Title style={{ color: colors.ink }}>{conversation?.title || conversation?.name || 'Conversa'}</Dialog.Title>
        <Dialog.ScrollArea style={{ paddingHorizontal: 0, borderColor: colors.line }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge" style={{ color: colors.ink }}>
                  Silenciar notificações
                </Text>
                <Text variant="bodySmall" style={{ color: colors.muted }}>
                  Continua a receber as mensagens, sem alertas.
                </Text>
              </View>
              <Switch value={muted} onValueChange={onToggleMute} color={colors.gold} disabled={busy} testID="toggle-mute" />
            </Row>
            <Text variant="labelMedium" style={{ color: colors.goldDark, marginTop: spacing.xs, marginBottom: spacing.xs }}>
              PARTICIPANTES ({participants.length})
            </Text>
            {participants.map((participant: any) => {
              const userId = participant.user?.id ?? participant.userId;
              const name = fullName(participant.user, 'Membro');
              const me = userId === currentUserId;
              return (
                <Row key={participant.id || userId} style={{ paddingVertical: 6 }}>
                  <Avatar name={name} url={participant.user?.avatarUrl} size={32} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ color: colors.ink }}>
                      {name}
                      {me ? ' (eu)' : ''}
                    </Text>
                    {participant.role || participant.user?.email ? (
                      <Text variant="bodySmall" style={{ color: colors.muted }}>
                        {['ADMIN', 'OWNER'].includes(String(participant.role)) ? 'Administrador' : participant.user?.email}
                      </Text>
                    ) : null}
                  </View>
                  {['ADMIN', 'OWNER'].includes(String(participant.role)) ? <Tag label="Admin" tone="gold" /> : null}
                  {canManage && onRemoveParticipant && !me && isGroup ? (
                    <Button compact mode="text" textColor={colors.danger} disabled={busy} onPress={() => onRemoveParticipant(userId)}>
                      Remover
                    </Button>
                  ) : null}
                </Row>
              );
            })}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          {onLeave && isGroup ? (
            <Button onPress={onLeave} textColor={colors.danger} disabled={busy} icon="logout" testID="leave-conversation">
              Sair do grupo
            </Button>
          ) : null}
          <Button onPress={onDismiss} textColor={colors.ink}>
            Fechar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
