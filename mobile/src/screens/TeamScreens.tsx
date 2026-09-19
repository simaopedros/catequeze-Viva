import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { Avatar } from '../components/Avatar';
import { SelectField, type SelectOption } from '../components/forms';
import { BrandButton, Card, EmptyState, ErrorText, Field, IconAction, ListCard, ListRow, PrimaryFab, Row, Screen, ScreenTitle, SearchBar, SectionHeader, SkeletonList, Tag } from '../components/ui';
import { colors, radius, spacing } from '../theme';

function MemberActionsDialog({
  member,
  assignable,
  canManageRoles,
  busy,
  onDismiss,
  onMessage,
  onChangeRole,
  onRemove,
}: {
  member: TeamMember | null;
  assignable: string[];
  canManageRoles: boolean;
  busy?: boolean;
  onDismiss: () => void;
  onMessage?: (member: TeamMember) => void;
  onChangeRole?: (member: TeamMember, role: string) => void;
  onRemove?: (member: TeamMember) => void;
}) {
  return (
    <Portal>
      <Dialog visible={Boolean(member)} onDismiss={onDismiss} style={{ backgroundColor: colors.surface, borderRadius: radius.lg }}>
        <Dialog.Title style={{ color: colors.ink }}>{member ? fullName(member.user, 'Membro') : ''}</Dialog.Title>
        <Dialog.Content>
          {member ? (
            <View style={{ gap: 4 }}>
              {onMessage ? <Button mode="text" icon="message-text-outline" textColor={colors.ink} contentStyle={{ justifyContent: 'flex-start' }} onPress={() => { onDismiss(); onMessage(member); }}>Enviar mensagem</Button> : null}
              {canManageRoles && onChangeRole
                ? assignable
                    .filter((role) => role !== member.role)
                    .map((role) => (
                      <Button key={role} mode="text" icon="account-convert-outline" textColor={colors.ink} contentStyle={{ justifyContent: 'flex-start' }} disabled={busy} onPress={() => { onDismiss(); onChangeRole(member, role); }} testID={`role-${role}`}>
                        {`Tornar ${(ROLE_LABELS[role] ?? role).toLowerCase()}`}
                      </Button>
                    ))
                : null}
              {canManageRoles && onRemove ? (
                <Button mode="text" icon="account-remove-outline" textColor={colors.danger} contentStyle={{ justifyContent: 'flex-start' }} disabled={busy} onPress={() => { onDismiss(); onRemove(member); }} testID="remove-member">
                  Remover da paróquia
                </Button>
              ) : null}
            </View>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} textColor={colors.muted}>Fechar</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
import { formatRelative, fullName } from '../utils/format';
import { ROLE_LABELS } from './MoreScreen';

const SHORT_ROLE: Record<string, { label: string; tone: 'gold' | 'info' | 'success' | 'neutral' | 'warning' }> = {
  PARISH_COORDINATOR: { label: 'Coordenação', tone: 'gold' },
  COMMUNITY_COORDINATOR: { label: 'Coord. comunidade', tone: 'gold' },
  LEAD_CATECHIST: { label: 'Catequista', tone: 'success' },
  ASSISTANT_CATECHIST: { label: 'Auxiliar', tone: 'success' },
  GUARDIAN: { label: 'Encarregado', tone: 'info' },
  CATECHUMEN: { label: 'Catequizando', tone: 'info' },
  CONTENT_REVIEWER: { label: 'Revisor', tone: 'neutral' },
  PASTORAL_VIEWER: { label: 'Pastoral', tone: 'neutral' },
  DIOCESE_ADMIN: { label: 'Diocese', tone: 'warning' },
};

export type TeamMember = {
  id: string;
  userId: string;
  role: string;
  status: string;
  community?: { id: string; name: string } | null;
  user: { id: string; email?: string; firstName?: string | null; lastName?: string | null; avatarUrl?: string | null };
  classes?: { id: string; name: string; role?: string }[];
};

export function TeamScreen({
  members,
  invitations,
  permissions,
  loading,
  error,
  onInvite,
  onChangeRole,
  onRemove,
  onResendInvite,
  onCancelInvite,
  onMessage,
  busyId,
  refreshing,
  onRefresh,
}: {
  members: TeamMember[];
  invitations: any[];
  permissions?: { canInvite?: boolean; canManageRoles?: boolean; canCancelInvites?: boolean; assignableRoles?: string[] } | null;
  loading?: boolean;
  error?: string | null;
  onInvite?: () => void;
  onChangeRole?: (member: TeamMember, role: string) => void;
  onRemove?: (member: TeamMember) => void;
  onResendInvite?: (invite: any) => void;
  onCancelInvite?: (invite: any) => void;
  onMessage?: (member: TeamMember) => void;
  busyId?: string | null;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((member) => !q || `${fullName(member.user)} ${member.user.email ?? ''}`.toLowerCase().includes(q));
  }, [members, query]);
  const grouped = useMemo(() => {
    const order = ['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'CONTENT_REVIEWER', 'PASTORAL_VIEWER', 'GUARDIAN', 'CATECHUMEN'];
    return [...filtered].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || fullName(a.user).localeCompare(fullName(b.user)));
  }, [filtered]);
  const assignable = permissions?.assignableRoles ?? [];

  return (
    <Screen
      testID="team-screen"
      refreshing={refreshing}
      onRefresh={onRefresh}
      fab={permissions?.canInvite && onInvite ? <PrimaryFab icon="account-plus-outline" label="Convidar" onPress={onInvite} testID="invite-member" /> : undefined}
    >
      <ScreenTitle title="Equipa" subtitle={`${members.length} membros${invitations.length ? ` · ${invitations.length} convites pendentes` : ''}`} />
      {members.length > 6 ? <SearchBar value={query} onChangeText={setQuery} placeholder="Procurar por nome ou e-mail" testID="team-search" /> : null}
      {loading && members.length === 0 ? <SkeletonList rows={5} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Equipa indisponível" body={error} /> : null}

      {invitations.length > 0 ? (
        <>
          <SectionHeader title="Convites pendentes" icon="email-fast-outline" />
          <ListCard>
            {invitations.map((invite: any, index: number) => {
              const meta = SHORT_ROLE[String(invite.role)];
              return (
                <ListRow
                  key={invite.id}
                  testID={`invite-${invite.id}`}
                  icon="email-outline"
                  title={invite.email || fullName(invite.user, 'Convite')}
                  subtitle={[meta?.label ?? invite.role, invite.createdAt ? `enviado ${formatRelative(invite.createdAt)}` : null].filter(Boolean).join(' · ')}
                  right={
                    <Row gap={4}>
                      {onResendInvite ? <IconAction icon="email-sync-outline" label="Reenviar" onPress={() => onResendInvite(invite)} testID={`resend-${invite.id}`} /> : null}
                      {permissions?.canCancelInvites && onCancelInvite ? <IconAction icon="close" label="Cancelar" onPress={() => onCancelInvite(invite)} testID={`cancel-${invite.id}`} /> : null}
                    </Row>
                  }
                  chevron={false}
                  last={index === invitations.length - 1}
                />
              );
            })}
          </ListCard>
        </>
      ) : null}

      {!loading && !error && members.length === 0 ? (
        <EmptyState icon="account-group-outline" title="Sem membros" body="Convide catequistas e coordenadores para a paróquia." action={permissions?.canInvite && onInvite ? 'Convidar' : undefined} onAction={onInvite} />
      ) : null}
      {grouped.length > 0 ? (
        <>
          <SectionHeader title="Membros" icon="account-group-outline" />
          <ListCard>
            {grouped.map((member, index) => {
              const name = fullName(member.user, 'Membro');
              const meta = SHORT_ROLE[member.role] ?? { label: ROLE_LABELS[member.role] ?? member.role, tone: 'neutral' as const };
              const classes = (member.classes ?? []).map((item) => item.name).join(', ');
              const canEdit = permissions?.canManageRoles && (onChangeRole || onRemove);
              return (
                <ListRow
                  key={member.id}
                  testID={`member-${member.id}`}
                  left={<Avatar name={name} url={member.user.avatarUrl} size={38} />}
                  title={name}
                  subtitle={[member.user.email, member.community?.name, classes ? `Turmas: ${classes}` : null].filter(Boolean).join(' · ')}
                  right={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Tag label={meta.label} tone={meta.tone} />
                      {member.status !== 'ACTIVE' ? <Tag label={member.status === 'PENDING' ? 'Pendente' : member.status} tone="warning" /> : null}
                    </View>
                  }
                  chevron={false}
                  onPress={
                    canEdit || onMessage
                      ? () => setMenuFor(member.id)
                      : undefined
                  }
                  last={index === grouped.length - 1}
                />
              );
            })}
          </ListCard>
          <MemberActionsDialog
            member={grouped.find((member) => member.id === menuFor) ?? null}
            assignable={assignable}
            canManageRoles={Boolean(permissions?.canManageRoles)}
            busy={Boolean(menuFor && busyId === menuFor)}
            onDismiss={() => setMenuFor(null)}
            onMessage={onMessage}
            onChangeRole={onChangeRole}
            onRemove={onRemove}
          />
        </>
      ) : null}
    </Screen>
  );
}

export function InviteMemberScreen({
  assignableRoles,
  communities,
  classes,
  busy,
  error,
  onSubmit,
}: {
  assignableRoles: string[];
  communities: { id: string; name: string }[];
  classes: { id: string; name: string }[];
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: { email: string; role: string; communityId?: string; classId?: string; classAssignmentRole?: 'LEAD' | 'ASSISTANT' }) => Promise<void> | void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string | null>(assignableRoles.includes('LEAD_CATECHIST') ? 'LEAD_CATECHIST' : assignableRoles[0] ?? null);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<'LEAD' | 'ASSISTANT' | null>('ASSISTANT');
  const [touched, setTouched] = useState(false);
  const emailError = touched && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) ? 'Indique um e-mail válido.' : null;
  const isCatechist = role === 'LEAD_CATECHIST' || role === 'ASSISTANT_CATECHIST';
  const roleOptions: SelectOption[] = assignableRoles.map((value) => ({ value, label: ROLE_LABELS[value] ?? value }));

  return (
    <Screen testID="invite-screen">
      <ScreenTitle title="Convidar membro" subtitle="A pessoa recebe um e-mail para entrar na paróquia." />
      <ErrorText message={error} />
      <Field label="E-mail" icon="email-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" error={emailError} testID="invite-email" />
      <SelectField label="Papel" icon="account-tie-outline" value={role} options={roleOptions} onChange={setRole} testID="invite-role" />
      {communities.length > 0 ? (
        <SelectField label="Comunidade (opcional)" icon="church" value={communityId} options={communities.map((item) => ({ value: item.id, label: item.name }))} onChange={setCommunityId} allowClear testID="invite-community" />
      ) : null}
      {isCatechist && classes.length > 0 ? (
        <>
          <SelectField label="Turma (opcional)" icon="school-outline" value={classId} options={classes.map((item) => ({ value: item.id, label: item.name }))} onChange={setClassId} allowClear testID="invite-class" />
          {classId ? (
            <SelectField
              label="Função na turma"
              icon="account-star-outline"
              value={assignment}
              options={[
                { value: 'LEAD', label: 'Catequista principal' },
                { value: 'ASSISTANT', label: 'Catequista auxiliar' },
              ]}
              onChange={(value) => setAssignment(value as 'LEAD' | 'ASSISTANT' | null)}
            />
          ) : null}
        </>
      ) : null}
      <Card tone="paper">
        <Text variant="bodySmall" style={{ color: colors.muted }}>
          Convites para famílias (encarregados e catequizandos) ligam a conta ao portal da família; pode associá-los a um agregado na plataforma web.
        </Text>
      </Card>
      <BrandButton
        testID="invite-submit"
        icon="send-outline"
        label={busy ? 'A enviar…' : 'Enviar convite'}
        loading={busy}
        disabled={busy || !role}
        onPress={() => {
          setTouched(true);
          if (!role || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return;
          void onSubmit({ email: email.trim(), role, communityId: communityId ?? undefined, classId: isCatechist ? classId ?? undefined : undefined, classAssignmentRole: isCatechist && classId ? assignment ?? undefined : undefined });
        }}
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}
