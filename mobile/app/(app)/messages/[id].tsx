import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { ConversationInfoDialog } from '../../../src/components/ConversationInfoDialog';
import { useAsync } from '../../../src/hooks/useAsync';
import { useMutation } from '../../../src/hooks/useMutation';
import { ThreadScreen } from '../../../src/screens/ThreadScreen';

export default function ThreadRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user, workspaceId, refresh } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => api.conversation(String(id)), [id]);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  // Abrir a conversa marca-a como lida e atualiza o contador do bootstrap.
  useEffect(() => {
    if (!data) return;
    api
      .markConversationRead(String(id), workspaceId || undefined)
      .then(() => refresh().catch(() => undefined))
      .catch(() => undefined);
  }, [Boolean(data), data?.messages?.length]);

  const conversation = data?.conversation ?? data;
  const thread = data ? { ...conversation, messages: data.messages ?? conversation?.messages ?? [] } : null;
  const myParticipant = (conversation?.participants ?? []).find((p: any) => (p.user?.id ?? p.userId) === user?.id);
  const muted = Boolean(myParticipant?.mutedAt ?? myParticipant?.muted);

  const mute = useMutation((next: boolean) => api.muteConversation(String(id), next, workspaceId || undefined), {
    successMessage: (result: any) => (result?.muted ?? result?.mute ? 'Conversa silenciada.' : 'Notificações reativadas.'),
    onSuccess: () => void reload(),
  });
  const leave = useMutation(() => api.removeConversationParticipant(String(id), String(user?.id), workspaceId || undefined), {
    successMessage: 'Saiu da conversa.',
    onSuccess: () => router.replace('/(app)/(tabs)/messages'),
  });
  const removeParticipant = useMutation((userId: string) => api.removeConversationParticipant(String(id), userId, workspaceId || undefined), {
    successMessage: 'Participante removido.',
    onSuccess: () => void reload(),
  });

  return (
    <>
      <ThreadScreen
        data={thread}
        loading={loading}
        error={error}
        busy={busy}
        currentUserId={user?.id}
        sendError={sendError}
        onOpenInfo={() => setInfoOpen(true)}
        onSend={async (content) => {
          setBusy(true);
          setSendError(null);
          try {
            await api.sendMessage(String(id), content);
            await reload();
          } catch (err) {
            setSendError(err instanceof Error ? err.message : 'Não foi possível enviar a mensagem.');
            throw err;
          } finally {
            setBusy(false);
          }
        }}
      />
      <ConversationInfoDialog
        visible={infoOpen}
        conversation={conversation}
        currentUserId={user?.id}
        muted={muted}
        busy={mute.busy || leave.busy || removeParticipant.busy}
        canManage={['ADMIN', 'OWNER'].includes(String(myParticipant?.role)) || conversation?.createdById === user?.id}
        onToggleMute={(next) => void mute.run(next)}
        onLeave={() => {
          setInfoOpen(false);
          void leave.run();
        }}
        onRemoveParticipant={(userId) => void removeParticipant.run(userId)}
        onDismiss={() => setInfoOpen(false)}
      />
    </>
  );
}
