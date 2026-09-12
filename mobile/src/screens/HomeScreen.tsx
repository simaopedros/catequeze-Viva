import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { BrandButton, Card, EmptyState, LoadingState, MenuRow, Screen, ScreenTitle } from '../components/ui';
import { formatDate, personName } from '../lib/payload';
import { colors, spacing } from '../theme';

type Meeting = {
  id: string;
  title?: string;
  theme?: string;
  startsAt?: string;
  date?: string;
  class?: { name?: string };
};

type Birthday = {
  id: string;
  firstName?: string;
  lastName?: string;
  daysUntil?: number;
  className?: string;
};

export function HomeScreen({
  name,
  stats,
  meetings,
  loading,
  error,
  onOpenMeeting,
  onOpenCommunity,
  onOpenNotifications,
  onOpenHref,
  unread,
}: {
  name: string;
  stats?: {
    activeClasses?: number;
    activeCatechumens?: number;
    avgAttendance?: number;
    upcomingMeetings?: Meeting[];
    todayMeetings?: Meeting[];
    pendingAttendanceMeeting?: Meeting | null;
    upcomingBirthdays?: Birthday[];
  } | null;
  meetings?: Meeting[];
  loading?: boolean;
  error?: string | null;
  onOpenMeeting: (id: string) => void;
  onOpenCommunity: () => void;
  onOpenNotifications: () => void;
  onOpenHref: (href: string) => void;
  unread?: number;
}) {
  const upcoming = meetings ?? stats?.upcomingMeetings ?? stats?.todayMeetings ?? [];
  const pending = stats?.pendingAttendanceMeeting;
  const birthdays = stats?.upcomingBirthdays ?? [];

  return (
    <Screen testID="home-screen">
      <ScreenTitle title={`Olá, ${name}`} subtitle="O essencial da catequese, no bolso." />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Não foi possível carregar o início" body={error} /> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: colors.muted }}>Turmas</Text>
          <Text style={{ color: colors.ink, fontSize: 28, fontWeight: '700' }}>{stats?.activeClasses ?? '—'}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: colors.muted }}>Catequizandos</Text>
          <Text style={{ color: colors.ink, fontSize: 28, fontWeight: '700' }}>
            {stats?.activeCatechumens ?? '—'}
          </Text>
        </Card>
      </View>
      <Card>
        <Text style={{ color: colors.muted }}>Média de presença</Text>
        <Text style={{ color: colors.ink, fontSize: 28, fontWeight: '700' }}>
          {stats?.avgAttendance != null ? `${stats.avgAttendance}%` : '—'}
        </Text>
      </Card>
      {pending?.id ? (
        <Pressable onPress={() => onOpenMeeting(pending.id)} testID="pending-attendance">
          <Card>
            <Text style={{ color: colors.goldDark, fontWeight: '700' }}>Chamada pendente</Text>
            <Text style={{ color: colors.ink, fontWeight: '700', marginTop: 6 }}>
              {pending.title || pending.theme || 'Encontro'}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              {pending.class?.name || 'Turma'}
              {pending.date || pending.startsAt ? ` · ${formatDate(pending.date || pending.startsAt)}` : ''}
            </Text>
          </Card>
        </Pressable>
      ) : null}
      <BrandButton label={`Notificações${unread ? ` (${unread})` : ''}`} onPress={onOpenNotifications} />
      <BrandButton variant="ghost" label="Ir à Comunidade" onPress={onOpenCommunity} />
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 18, marginVertical: spacing.sm }}>
        Atalhos
      </Text>
      <MenuRow label="Catequizandos" hint="Pessoas da catequese" onPress={() => onOpenHref('/(app)/catechumens')} />
      <MenuRow label="Biblioteca" hint="Materiais de encontro" onPress={() => onOpenHref('/(app)/content')} />
      <MenuRow label="Comunicados" hint="Avisos pastorais" onPress={() => onOpenHref('/(app)/announcements')} />
      <MenuRow label="Calendário" hint="Encontros e eventos litúrgicos" onPress={() => onOpenHref('/(app)/(tabs)/calendar')} />
      {birthdays.length > 0 ? (
        <>
          <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 18, marginVertical: spacing.sm }}>
            Aniversários próximos
          </Text>
          {birthdays.slice(0, 3).map((row) => (
            <Card key={row.id}>
              <Text style={{ color: colors.ink, fontWeight: '700' }}>{personName(row)}</Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>
                {row.daysUntil === 0 ? 'Hoje' : `Em ${row.daysUntil} dia(s)`}
                {row.className ? ` · ${row.className}` : ''}
              </Text>
            </Card>
          ))}
        </>
      ) : null}
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 18, marginVertical: spacing.sm }}>
        Próximos encontros
      </Text>
      {upcoming.length === 0 && !loading ? (
        <EmptyState title="Sem encontros à vista" body="Quando houver um encontro marcado, aparece aqui." />
      ) : (
        upcoming.slice(0, 5).map((meeting) => (
          <Pressable key={meeting.id} onPress={() => onOpenMeeting(meeting.id)} testID={`meeting-${meeting.id}`}>
            <Card>
              <Text style={{ color: colors.ink, fontWeight: '700' }}>
                {meeting.title || meeting.theme || 'Encontro'}
              </Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>
                {meeting.class?.name || 'Turma'}{' '}
                {meeting.startsAt || meeting.date ? `· ${formatDate(meeting.startsAt || meeting.date)}` : ''}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
