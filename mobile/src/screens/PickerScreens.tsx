import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Checkbox, Text } from 'react-native-paper';
import { Avatar } from '../components/Avatar';
import { BrandButton, EmptyState, ErrorText, ListCard, ListRow, Screen, ScreenTitle, SearchBar, SkeletonList, Tag } from '../components/ui';
import { colors, spacing } from '../theme';
import { fullName } from '../utils/format';

/** Escolher catequizandos do espaço para inscrever numa turma. */
export function EnrollCatechumensScreen({
  className,
  candidates,
  alreadyEnrolledIds,
  loading,
  error,
  busy,
  actionError,
  onSubmit,
  onCreateCatechumen,
}: {
  className?: string | null;
  candidates: any[];
  alreadyEnrolledIds: string[];
  loading?: boolean;
  error?: string | null;
  busy?: boolean;
  actionError?: string | null;
  onSubmit: (catechumenProfileIds: string[]) => Promise<void> | void;
  onCreateCatechumen?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const enrolled = new Set(alreadyEnrolledIds);
  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((item) => !enrolled.has(item.id) && (!q || fullName(item).toLowerCase().includes(q)));
  }, [candidates, query, alreadyEnrolledIds]);

  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <Screen testID="enroll-screen">
      <ScreenTitle eyebrow={className ?? undefined} title="Inscrever catequizandos" subtitle="Selecione um ou vários catequizandos para esta turma." />
      {candidates.length > 5 ? <SearchBar value={query} onChangeText={setQuery} placeholder="Procurar por nome" testID="enroll-search" /> : null}
      <ErrorText message={actionError} />
      {loading && candidates.length === 0 ? <SkeletonList rows={5} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Catequizandos indisponíveis" body={error} /> : null}
      {!loading && !error && available.length === 0 ? (
        <EmptyState
          icon="account-check-outline"
          title={candidates.length === 0 ? 'Sem catequizandos' : 'Todos já inscritos'}
          body={candidates.length === 0 ? 'Crie primeiro a ficha do catequizando.' : 'Não há catequizandos por inscrever nesta turma.'}
          action={onCreateCatechumen ? 'Criar catequizando' : undefined}
          onAction={onCreateCatechumen}
        />
      ) : null}
      {available.length > 0 ? (
        <ListCard>
          {available.map((item, index) => {
            const name = fullName(item, 'Catequizando');
            const active = selected.includes(item.id);
            const otherClass = item.enrollments?.[0]?.class?.name;
            return (
              <ListRow
                key={item.id}
                testID={`enroll-${item.id}`}
                left={<Avatar name={name} url={item.avatarUrl || item.photoUrl} size={36} />}
                title={name}
                subtitle={otherClass ? `Também em ${otherClass}` : item.household?.name}
                right={<Checkbox status={active ? 'checked' : 'unchecked'} color={colors.gold} uncheckedColor={colors.line} />}
                chevron={false}
                onPress={() => toggle(item.id)}
                last={index === available.length - 1}
              />
            );
          })}
        </ListCard>
      ) : null}
      <BrandButton
        testID="enroll-submit"
        icon="account-plus-outline"
        label={busy ? 'A inscrever…' : selected.length > 1 ? `Inscrever ${selected.length} catequizandos` : 'Inscrever'}
        loading={busy}
        disabled={busy || selected.length === 0}
        onPress={() => void onSubmit(selected)}
      />
    </Screen>
  );
}

/** Gerir catequistas de uma turma a partir dos membros da paróquia. */
export function ClassCatechistsScreen({
  className,
  members,
  assigned,
  loading,
  error,
  busyUserId,
  actionError,
  onAdd,
  onRemove,
}: {
  className?: string | null;
  members: any[];
  assigned: { userId: string; role?: string }[];
  loading?: boolean;
  error?: string | null;
  busyUserId?: string | null;
  actionError?: string | null;
  onAdd: (userId: string) => Promise<void> | void;
  onRemove: (userId: string) => Promise<void> | void;
}) {
  const [query, setQuery] = useState('');
  const assignedMap = new Map(assigned.map((item) => [item.userId, item.role]));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((member) => !q || fullName(member.user).toLowerCase().includes(q));
  }, [members, query]);

  return (
    <Screen testID="class-catechists-screen">
      <ScreenTitle eyebrow={className ?? undefined} title="Catequistas da turma" subtitle="Adicione ou remova catequistas auxiliares. O catequista principal é definido na web." />
      {members.length > 5 ? <SearchBar value={query} onChangeText={setQuery} placeholder="Procurar catequista" testID="catechists-search" /> : null}
      <ErrorText message={actionError} />
      {loading && members.length === 0 ? <SkeletonList rows={4} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Equipa indisponível" body={error} /> : null}
      {!loading && !error && members.length === 0 ? <EmptyState icon="account-tie-outline" title="Sem catequistas" body="Convide catequistas para a paróquia na plataforma web." /> : null}
      {filtered.length > 0 ? (
        <ListCard>
          {filtered.map((member, index) => {
            const userId = member.userId || member.user?.id;
            const name = fullName(member.user, 'Catequista');
            const role = assignedMap.get(userId);
            const isAssigned = assignedMap.has(userId);
            const isLead = role === 'LEAD';
            const busy = busyUserId === userId;
            return (
              <ListRow
                key={userId}
                testID={`catechist-${userId}`}
                left={<Avatar name={name} url={member.user?.avatarUrl} size={36} />}
                title={name}
                subtitle={member.user?.email}
                right={
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    {isLead ? <Tag label="Principal" tone="gold" /> : null}
                    {!isLead ? (
                      <BrandButton
                        variant={isAssigned ? 'ghost' : 'tonal'}
                        label={busy ? '…' : isAssigned ? 'Remover' : 'Adicionar'}
                        disabled={Boolean(busyUserId)}
                        onPress={() => void (isAssigned ? onRemove(userId) : onAdd(userId))}
                        style={{ marginTop: 0 }}
                        testID={`${isAssigned ? 'remove' : 'add'}-catechist-${userId}`}
                      />
                    ) : null}
                  </View>
                }
                chevron={false}
                last={index === filtered.length - 1}
              />
            );
          })}
        </ListCard>
      ) : null}
      <Text variant="bodySmall" style={{ color: colors.muted, marginTop: spacing.xs }}>
        {assigned.length} catequista(s) atribuído(s).
      </Text>
    </Screen>
  );
}
