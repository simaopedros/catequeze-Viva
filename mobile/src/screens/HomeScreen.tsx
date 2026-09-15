import React from 'react';
import { Text } from 'react-native';
import {
  EmptyState,
  HeroHeader,
  LoadingState,
  PersonRow,
  Screen,
  ScreenTitle,
  ShortcutRow,
} from '../components/ui';
import { canMarkAttendance, isFamilyRole } from '../lib/roleAccess';
import { formatDate, personName } from '../lib/payload';
import { colors, fonts, spacing } from '../theme';

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

function meetingTitle(meeting?: Meeting | null) {
  return meeting?.title || meeting?.theme || 'Encontro';
}

export function HomeScreen({
  name,
  role,
  isAdmin,
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
  role?: string | null;
  isAdmin?: boolean;
  stats?: {
    activeClasses?: number;
    activeCatechumens?: number;
    avgAttendance?: number;
    upcomingMeetings?: Meeting[];
    todayMeetings?: Meeting[];
    recentMeetings?: Meeting[];
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
  const canAttend = canMarkAttendance(role, isAdmin);
  const family = isFamilyRole(role);
  const upcoming =
    (meetings && meetings.length > 0 ? meetings : null) ??
    (stats?.upcomingMeetings?.length ? stats.upcomingMeetings : null) ??
    (stats?.todayMeetings?.length ? stats.todayMeetings : null) ??
    [];
  const recent = stats?.recentMeetings ?? [];
  const shownMeetings = upcoming.length > 0 ? upcoming : recent;
  const meetingHeading =
    upcoming.length > 0 ? 'A seguir' : shownMeetings.length > 0 ? 'Encontros recentes' : 'Próximos encontros';
  const pending = canAttend ? stats?.pendingAttendanceMeeting : null;
  const birthdays = stats?.upcomingBirthdays ?? [];
  const heroMeeting = pending || shownMeetings[0];

  const shortcuts = family
    ? [
        { id: 'messages', label: 'Mensagens', hint: 'Falar com a turma', onPress: () => onOpenHref('/(app)/messages') },
        { id: 'calendar', label: 'Calendário', hint: 'Encontros', onPress: () => onOpenHref('/(app)/(tabs)/calendar') },
        { id: 'children', label: 'Catequizandos', hint: 'A sua família', onPress: () => onOpenHref('/(app)/catechumens') },
      ]
    : [
        { id: 'classes', label: 'Turmas', hint: `${stats?.activeClasses ?? '—'} ativas`, onPress: () => onOpenHref('/(app)/(tabs)/classes') },
        { id: 'people', label: 'Catequizandos', hint: `${stats?.activeCatechumens ?? '—'} inscritos`, onPress: () => onOpenHref('/(app)/catechumens') },
        {
          id: 'community',
          label: 'Comunidade',
          hint: unread ? `${unread} avisos` : 'Feed da rede',
          onPress: onOpenCommunity,
        },
      ];

  return (
    <Screen testID="home-screen">
      <ScreenTitle title={`Olá, ${name}`} subtitle="O que faço agora?" />
      {loading ? <LoadingState /> : null}
      {error ? (
        <EmptyState title="Não foi possível carregar o início" body={error} actionLabel="Tentar de novo" />
      ) : null}
      {heroMeeting?.id ? (
        <HeroHeader
          testID={pending?.id ? 'pending-attendance' : `meeting-${heroMeeting.id}`}
          kicker={pending ? 'Chamada pendente' : meetingHeading}
          title={meetingTitle(heroMeeting)}
          subtitle={[heroMeeting.class?.name, formatDate(heroMeeting.date || heroMeeting.startsAt)]
            .filter(Boolean)
            .join(' · ')}
          actionLabel={pending ? 'Marcar presença' : 'Abrir encontro'}
          onAction={() => onOpenMeeting(heroMeeting.id)}
        />
      ) : !loading ? (
        <EmptyState
          title="Sem encontros à vista"
          body="Quando houver um encontro marcado, aparece aqui."
          actionLabel="Ir à Comunidade"
          onAction={onOpenCommunity}
        />
      ) : null}
      <ShortcutRow items={shortcuts} />
      {stats?.avgAttendance != null && canAttend ? (
        <Text style={{ color: colors.muted, fontFamily: fonts.sansMedium, marginBottom: spacing.md }}>
          Média de presença {stats.avgAttendance}%
        </Text>
      ) : null}
      {birthdays.length > 0 ? (
        <>
          <Text style={{ color: colors.ink, fontFamily: fonts.serif, fontSize: 20, marginBottom: spacing.sm }}>
            Aniversários
          </Text>
          {birthdays.slice(0, 3).map((row) => (
            <PersonRow
              key={row.id}
              name={personName(row)}
              hint={row.daysUntil === 0 ? 'Hoje' : `Em ${row.daysUntil} dia(s)`}
              chip={row.className}
            />
          ))}
        </>
      ) : null}
      {shownMeetings.length > 1 ? (
        <>
          <Text
            style={{
              color: colors.ink,
              fontFamily: fonts.serif,
              fontSize: 20,
              marginTop: spacing.md,
              marginBottom: spacing.sm,
            }}
          >
            {meetingHeading}
          </Text>
          {shownMeetings.slice(pending ? 0 : 1, 5).map((meeting) => (
            <PersonRow
              key={meeting.id}
              testID={`meeting-${meeting.id}`}
              name={meetingTitle(meeting)}
              hint={[meeting.class?.name, formatDate(meeting.startsAt || meeting.date)].filter(Boolean).join(' · ')}
              onPress={() => onOpenMeeting(meeting.id)}
            />
          ))}
        </>
      ) : null}
    </Screen>
  );
}
