import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from 'react-native-paper';
import {
  Card,
  EmptyState,
  Icon,
  ListCard,
  ListRow,
  Row,
  ScreenTitle,
  Screen,
  SectionHeader,
  SkeletonList,
  StatCard,
} from '../components/ui';
import { colors, spacing } from '../theme';
import { formatDateTime } from '../utils/format';

type Meeting = {
  id: string;
  title?: string;
  theme?: string;
  startsAt?: string;
  class?: { name?: string };
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 19) return 'Boa tarde';
  return 'Boa noite';
}

export function HomeScreen({
  name,
  stats,
  meetings,
  loading,
  error,
  onOpenMeeting,
  onOpenCommunity,
  onOpenNotifications,
  onOpenClasses,
  onOpenMessages,
  onOpenBible,
  unread,
  refreshing,
  onRefresh,
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
  onOpenClasses?: () => void;
  onOpenMessages?: () => void;
  onOpenBible?: () => void;
  unread?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const upcoming = meetings ?? stats?.upcomingMeetings ?? stats?.todayMeetings ?? [];
  const firstName = name.split(' ')[0] || name;

  return (
    <Screen testID="home-screen" safeTop refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenTitle
        eyebrow={greeting()}
        title={`Olá, ${firstName}`}
        subtitle="O essencial da catequese, no bolso."
        action={
          <Pressable
            accessibilityRole="button"
            onPress={onOpenNotifications}
            testID="home-notifications"
            style={{ position: 'relative', padding: 6 }}
          >
            <Icon name="bell-outline" size={26} color={colors.ink} />
            {unread ? (
              <View
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  minWidth: 18,
                  height: 18,
                  paddingHorizontal: 4,
                  borderRadius: 9,
                  backgroundColor: colors.gold,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="labelSmall" style={{ color: colors.ink, fontWeight: '700' }}>
                  {unread > 99 ? '99+' : unread}
                </Text>
              </View>
            ) : null}
          </Pressable>
        }
      />
      {error ? <EmptyState icon="cloud-off-outline" title="Não foi possível carregar o início" body={error} /> : null}
      {loading && !stats ? (
        <SkeletonList rows={3} />
      ) : (
        <>
          <Row style={{ alignItems: 'stretch' }}>
            <StatCard label="Turmas" value={stats?.activeClasses ?? '—'} icon="school-outline" onPress={onOpenClasses} testID="stat-classes" />
            <StatCard
              label="Catequizandos"
              value={stats?.activeCatechumens ?? '—'}
              icon="account-child-outline"
              onPress={onOpenClasses}
              testID="stat-catechumens"
            />
          </Row>
          {typeof stats?.avgAttendance === 'number' ? (
            <Card tone="ink">
              <Row>
                <Icon name="chart-arc" size={22} color={colors.goldLight} />
                <View style={{ flex: 1 }}>
                  <Text variant="labelMedium" style={{ color: colors.tabInactive }}>
                    Presença média
                  </Text>
                  <Text variant="headlineSmall" style={{ color: colors.white }}>
                    {Math.round(stats.avgAttendance)}%
                  </Text>
                </View>
              </Row>
            </Card>
          ) : null}

          <SectionHeader title="Atalhos" icon="lightning-bolt-outline" />
          <ListCard>
            <ListRow icon="account-group-outline" title="Comunidade" subtitle="Feed, tópicos e Shorts" onPress={onOpenCommunity} />
            {onOpenMessages ? <ListRow icon="message-text-outline" title="Mensagens" subtitle="Conversas da paróquia e turmas" onPress={onOpenMessages} /> : null}
            {onOpenBible ? <ListRow icon="book-cross" title="Bíblia" subtitle="Leitura e partilha de versículos" onPress={onOpenBible} /> : null}
            <ListRow icon="bell-outline" title="Notificações" meta={unread ? String(unread) : undefined} onPress={onOpenNotifications} last />
          </ListCard>

          <SectionHeader title="Próximos encontros" icon="calendar-clock-outline" />
          {upcoming.length === 0 ? (
            <EmptyState icon="calendar-blank-outline" title="Sem encontros à vista" body="Quando houver um encontro marcado, aparece aqui." />
          ) : (
            <ListCard>
              {upcoming.slice(0, 5).map((meeting, index, list) => (
                <ListRow
                  key={meeting.id}
                  testID={`meeting-${meeting.id}`}
                  icon="calendar-outline"
                  title={meeting.title || meeting.theme || 'Encontro'}
                  subtitle={[meeting.class?.name, formatDateTime(meeting.startsAt)].filter(Boolean).join(' · ')}
                  onPress={() => onOpenMeeting(meeting.id)}
                  last={index === list.length - 1}
                />
              ))}
            </ListCard>
          )}
        </>
      )}
      <View style={{ height: spacing.md }} />
    </Screen>
  );
}
