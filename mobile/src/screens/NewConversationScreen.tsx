import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BrandButton, Card, EmptyState, ErrorText, Field, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors, spacing } from '../theme';

type Contact = {
  id: string;
  displayName?: string;
  firstName?: string | null;
  lastName?: string | null;
  maskedEmail?: string | null;
  role?: string;
};

function asContacts(payload: any): Contact[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.contacts)) return payload.contacts;
  return [];
}

function contactName(contact: Contact): string {
  return (
    contact.displayName ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
    contact.maskedEmail ||
    'Membro'
  );
}

export function NewConversationScreen({
  payload,
  loading,
  error,
  busy,
  actionError,
  onCreate,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  busy?: boolean;
  actionError?: string | null;
  onCreate: (participantUserIds: string[], title?: string) => Promise<void> | void;
}) {
  const contacts = asContacts(payload).filter((contact) => !contact.id.startsWith('profile:'));
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const isGroup = selected.length > 1;

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <Screen testID="new-conversation-screen">
      <ScreenTitle title="Nova conversa" subtitle="Escolha uma pessoa — ou várias para criar um grupo." />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Contactos indisponíveis" body={error} /> : null}
      <ErrorText message={actionError} />
      {!loading && contacts.length === 0 ? (
        <EmptyState title="Sem contactos" body="Não há pessoas disponíveis para conversar neste espaço." />
      ) : (
        contacts.map((contact) => {
          const active = selected.includes(contact.id);
          return (
            <Pressable key={contact.id} testID={`contact-${contact.id}`} onPress={() => toggle(contact.id)}>
              <Card style={active ? { borderColor: colors.goldDark, borderWidth: 2 } : undefined}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: active ? colors.goldDark : colors.line,
                      backgroundColor: active ? colors.goldDark : 'transparent',
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.ink, fontWeight: '700' }}>{contactName(contact)}</Text>
                    {contact.role ? (
                      <Text style={{ color: colors.muted, marginTop: 2, fontSize: 12 }}>{contact.role}</Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })
      )}
      {isGroup ? (
        <Field label="Nome do grupo" value={title} onChangeText={setTitle} testID="group-title" />
      ) : null}
      <View style={{ marginTop: spacing.sm }}>
        <BrandButton
          testID="create-conversation"
          label={busy ? 'A criar…' : isGroup ? 'Criar grupo' : 'Iniciar conversa'}
          disabled={busy || selected.length === 0 || (isGroup && !title.trim())}
          onPress={() => onCreate(selected, isGroup ? title.trim() : undefined)}
        />
      </View>
    </Screen>
  );
}
