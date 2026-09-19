import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Checkbox, Text } from 'react-native-paper';
import { Avatar } from '../components/Avatar';
import { BrandButton, EmptyState, ErrorText, Field, ListCard, ListRow, Screen, ScreenTitle, SearchBar, SkeletonList, Tag } from '../components/ui';
import { colors, spacing } from '../theme';

type Contact = {
  id: string;
  displayName?: string;
  firstName?: string | null;
  lastName?: string | null;
  maskedEmail?: string | null;
  avatarUrl?: string | null;
  role?: string;
};

const ROLE_LABEL: Record<string, string> = {
  PARISH_COORDINATOR: 'Coordenação',
  COMMUNITY_COORDINATOR: 'Coordenação',
  LEAD_CATECHIST: 'Catequista',
  ASSISTANT_CATECHIST: 'Catequista auxiliar',
  GUARDIAN: 'Encarregado(a)',
  CATECHUMEN: 'Catequizando',
  PASTORAL_VIEWER: 'Pastoral',
};

function asContacts(payload: any): Contact[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.contacts)) return payload.contacts;
  return [];
}

function contactName(contact: Contact): string {
  return contact.displayName || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.maskedEmail || 'Membro';
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
  const [query, setQuery] = useState('');
  const isGroup = selected.length > 1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((contact) => contactName(contact).toLowerCase().includes(q));
  }, [contacts, query]);

  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <Screen testID="new-conversation-screen">
      <ScreenTitle title="Nova conversa" subtitle="Escolha uma pessoa — ou várias para criar um grupo." />
      {contacts.length > 5 ? <SearchBar value={query} onChangeText={setQuery} placeholder="Procurar pessoa" testID="contacts-search" /> : null}
      {selected.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm }}>
          {selected.map((id) => {
            const contact = contacts.find((item) => item.id === id);
            return contact ? <Tag key={id} label={contactName(contact)} tone="gold" icon="account" /> : null;
          })}
        </View>
      ) : null}
      {loading && contacts.length === 0 ? <SkeletonList rows={4} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Contactos indisponíveis" body={error} /> : null}
      <ErrorText message={actionError} />
      {!loading && contacts.length === 0 && !error ? (
        <EmptyState icon="account-search-outline" title="Sem contactos" body="Não há pessoas disponíveis para conversar neste espaço." />
      ) : null}
      {filtered.length > 0 ? (
        <ListCard>
          {filtered.map((contact, index) => {
            const active = selected.includes(contact.id);
            const name = contactName(contact);
            return (
              <ListRow
                key={contact.id}
                testID={`contact-${contact.id}`}
                left={<Avatar name={name} url={contact.avatarUrl} size={36} />}
                title={name}
                subtitle={ROLE_LABEL[String(contact.role)] || contact.role}
                right={<Checkbox status={active ? 'checked' : 'unchecked'} color={colors.gold} uncheckedColor={colors.line} />}
                chevron={false}
                onPress={() => toggle(contact.id)}
                last={index === filtered.length - 1}
              />
            );
          })}
        </ListCard>
      ) : null}
      {isGroup ? <Field label="Nome do grupo" icon="account-group-outline" value={title} onChangeText={setTitle} testID="group-title" /> : null}
      <BrandButton
        testID="create-conversation"
        icon={isGroup ? 'account-multiple-plus-outline' : 'message-plus-outline'}
        label={busy ? 'A criar…' : isGroup ? 'Criar grupo' : 'Iniciar conversa'}
        loading={busy}
        disabled={busy || selected.length === 0 || (isGroup && !title.trim())}
        onPress={() => onCreate(selected, isGroup ? title.trim() : undefined)}
      />
      {selected.length === 0 ? (
        <Text variant="bodySmall" style={{ color: colors.muted, textAlign: 'center', marginTop: spacing.xs }}>
          Selecione pelo menos uma pessoa.
        </Text>
      ) : null}
    </Screen>
  );
}
