import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { BrandButton, Card, EmptyState, LoadingState, MenuRow, Screen, ScreenTitle } from '../components/ui';
import { formatDate } from '../lib/payload';
import { colors, spacing } from '../theme';

type Meeting = {
  id: string;
  title?: string;
  theme?: string;
  startsAt?: string;
  date?: string;
  class?: { name?: string };
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
      <BrandButton label={`Notificações${unread ? ` (${unread})` : ''}`} onPress={onOpenNotifications} />
      <BrandButton variant="ghost" label="Ir à Comunidade" onPress={onOpenCommunity} />
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 18, marginVertical: spacing.sm }}>
        Atalhos
      </Text>
      <MenuRow label="Catequizandos" hint="Pessoas da catequese" onPress={() => onOpenHref('/(app)/catechumens')} />
      <MenuRow label="Biblioteca" hint="Materiais de encontro" onPress={() => onOpenHref('/(app)/content')} />
      <MenuRow label="Comunicados" hint="Avisos pastorais" onPress={() => onOpenHref('/(app)/announcements')} />
      <MenuRow label="Calendário" hint="Eventos litúrgicos" onPress={() => onOpenHref('/(app)/calendar')} />
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
