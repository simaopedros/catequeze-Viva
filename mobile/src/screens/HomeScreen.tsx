import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from 'react-native-paper';
import {
  BrandButton,
  Card,
  EmptyState,
  Icon,
  ListCard,
  ListRow,
  Row,
  ScreenTitle,
  Screen,
  SearchBar,
  SectionHeader,
  SkeletonList,
  StatCard,
  Tag,
} from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { formatDate, formatDateTime } from '../utils/format';

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

export function focusMeetingStatusLabel(
  meeting: { status?: string | null; date?: string | null },
  now: Date = new Date(),
): string {
  const status = meeting.status ?? '';
  if (status === 'IN_PROGRESS') return 'A decorrer';
  if (status === 'COMPLETED') return 'Concluído';
  const date = meeting.date ? new Date(meeting.date) : null;
  const isPast = Boolean(date && !Number.isNaN(date.getTime()) && date.getTime() < now.getTime());
  if (isPast) return 'Por concluir';
  return 'Agendado';
}

export type HomeFocus = {
  meeting?: {
    id: string;
    title?: string | null;
    theme?: string | null;
    date?: string;
    status?: string;
    class?: { id: string; name: string };
    locationHint?: string | null;
  } | null;
  focusKind?: string;
  attendanceSummary?: { registered: number; totalActive: number } | null;
  preparation?: { hasContent: boolean; contentTitle?: string | null } | null;
  notices?: { id: string; text?: string }[];
};

export type HomeAnnouncement = { id: string; title: string; body?: string | null; acknowledged?: boolean; createdAt?: string; inherited?: boolean };
export type HomeBirthday = { catechumenId: string; name: string; nextBirthday: string; age: number; className?: string; giftDelivered?: boolean };

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
  focus,
  announcements,
  onAcknowledgeAnnouncement,
  onOpenAnnouncements,
  birthdays,
  onOpenBirthdays,
  onOpenAttendance,
  onSearch,
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
  focus?: HomeFocus | null;
  announcements?: HomeAnnouncement[];
  onAcknowledgeAnnouncement?: (id: string) => void;
  onOpenAnnouncements?: () => void;
  birthdays?: HomeBirthday[];
  onOpenBirthdays?: () => void;
  onOpenAttendance?: (meetingId: string, classId?: string) => void;
  onSearch?: () => void;
}) {
  const upcoming = (meetings ?? stats?.upcomingMeetings ?? stats?.todayMeetings ?? []).filter((meeting) => meeting.id !== focus?.meeting?.id);
  const firstName = name.split(' ')[0] || name;
  const pendingAnnouncements = (announcements ?? []).filter((item) => !item.acknowledged);
  const soonBirthdays = (birthdays ?? []).slice(0, 3);

  return (
    <Screen testID="home-screen" safeTop safeBottom refreshing={refreshing} onRefresh={onRefresh}>
      <View style={{ position: 'relative' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -48, top: -36, width: 168, height: 168, borderRadius: 84, backgroundColor: '#F4E4C0', opacity: 0.7 }} />
        <View pointerEvents="none" style={{ position: 'absolute', right: 28, top: 28, width: 92, height: 92, borderRadius: 46, backgroundColor: '#F8E7BF', opacity: 0.55 }} />
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
      </View>
      {onSearch ? (
        <Pressable onPress={onSearch} testID="home-search" accessibilityLabel="Pesquisar">
          <View pointerEvents="none">
            <SearchBar value="" onChangeText={() => undefined} placeholder="Pesquisar turmas e pessoas" />
          </View>
        </Pressable>
      ) : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Não foi possível carregar o início" body={error} /> : null}
      {loading && !stats ? (
        <SkeletonList rows={3} />
      ) : (
        <>
          {focus?.meeting ? (
            <Card tone="ink" onPress={() => onOpenMeeting(focus.meeting!.id)} testID="focus-meeting" style={{ overflow: 'hidden' }}>
              <View pointerEvents="none" style={{ position: 'absolute', right: -8, bottom: -18, opacity: 0.16 }}>
                <Icon name="church" size={128} color={colors.goldLight} />
              </View>
              <Row style={{ justifyContent: 'space-between', marginBottom: spacing.xs }}>
                <Text variant="labelMedium" style={{ color: colors.goldLight, letterSpacing: 1 }}>
                  {focus.focusKind === 'in_progress' ? 'A DECORRER' : focus.focusKind === 'today' ? 'HOJE' : focus.focusKind === 'recent' ? 'ÚLTIMO ENCONTRO' : 'PRÓXIMO ENCONTRO'}
                </Text>
                <Tag label={focusMeetingStatusLabel(focus.meeting)} tone="gold" />
              </Row>
              <Text variant="titleLarge" style={{ color: colors.white, marginRight: 72 }}>
                {focus.meeting.title || focus.meeting.theme || 'Encontro'}
              </Text>
              <View style={{ marginTop: spacing.sm, gap: 6, marginRight: 56 }}>
                <Row gap={spacing.xs} style={{ alignItems: 'flex-start' }}>
                  <Icon name="calendar-outline" size={14} color={colors.tabInactive} />
                  <Text variant="bodySmall" style={{ color: colors.tabInactive, flex: 1 }}>
                    {[focus.meeting.class?.name, formatDateTime(focus.meeting.date)].filter(Boolean).join(' · ')}
                  </Text>
                </Row>
                {focus.meeting.locationHint ? (
                  <Row gap={spacing.xs} style={{ alignItems: 'flex-start' }}>
                    <Icon name="map-marker-outline" size={14} color={colors.tabInactive} />
                    <Text variant="bodySmall" style={{ color: colors.tabInactive, flex: 1 }}>
                      {focus.meeting.locationHint}
                    </Text>
                  </Row>
                ) : null}
                {focus.attendanceSummary ? (
                  <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
                    <Icon name="account-group-outline" size={14} color={colors.goldLight} />
                    <Text variant="bodySmall" style={{ color: colors.goldLight, flex: 1 }}>
                      Presenças: {focus.attendanceSummary.registered}/{focus.attendanceSummary.totalActive}
                      {focus.preparation?.contentTitle ? ` · Conteúdo: ${focus.preparation.contentTitle}` : ''}
                    </Text>
                  </Row>
                ) : null}
              </View>
              {onOpenAttendance ? (
                <Pressable
                  testID="focus-attendance"
                  accessibilityRole="button"
                  accessibilityLabel="Marcar presenças"
                  onPress={() => onOpenAttendance(focus.meeting!.id, focus.meeting!.class?.id)}
                  style={({ pressed }) => ({
                    marginTop: spacing.md,
                    backgroundColor: colors.gold,
                    borderRadius: radius.md,
                    minHeight: 48,
                    paddingHorizontal: spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: pressed ? 0.88 : 1,
                  })}
                >
                  <Row gap={spacing.sm}>
                    <Icon name="clipboard-check-outline" size={18} color={colors.ink} />
                    <Text variant="labelLarge" style={{ color: colors.ink, fontWeight: '600' }}>
                      Marcar presenças
                    </Text>
                  </Row>
                  <Icon name="chevron-right" size={20} color={colors.ink} />
                </Pressable>
              ) : null}
            </Card>
          ) : null}

          {pendingAnnouncements.length > 0 ? (
            <Card tone="gold" style={{ overflow: 'hidden' }}>
              <View pointerEvents="none" style={{ position: 'absolute', right: -12, bottom: -20, opacity: 0.28 }}>
                <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.gold, opacity: 0.25 }} />
              </View>
              <Row style={{ alignItems: 'flex-start' }}>
                <Icon name="bullhorn-outline" color={colors.goldDark} />
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ color: colors.ink }}>
                    {pendingAnnouncements[0].title}
                  </Text>
                  {pendingAnnouncements[0].body ? (
                    <Text variant="bodySmall" style={{ color: colors.goldDark, marginTop: 2 }} numberOfLines={3}>
                      {pendingAnnouncements[0].body}
                    </Text>
                  ) : null}
                  <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                    {onAcknowledgeAnnouncement ? (
                      <BrandButton
                        compact
                        variant="primary"
                        label="Entendi"
                        onPress={() => onAcknowledgeAnnouncement(pendingAnnouncements[0].id)}
                        style={{ marginTop: 0 }}
                        testID="ack-announcement"
                      />
                    ) : null}
                    {onOpenAnnouncements ? (
                      <Pressable
                        onPress={onOpenAnnouncements}
                        testID="open-announcements"
                        accessibilityRole="button"
                        style={{ alignSelf: 'center', paddingVertical: 4 }}
                      >
                        <Row gap={2}>
                          <Text variant="labelLarge" style={{ color: colors.ink, fontWeight: '600' }}>
                            {pendingAnnouncements.length > 1
                              ? `+${pendingAnnouncements.length - 1} ${pendingAnnouncements.length - 1 === 1 ? 'aviso' : 'avisos'}`
                              : 'Ver avisos'}
                          </Text>
                          <Icon name="chevron-right" size={16} color={colors.ink} />
                        </Row>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </Row>
            </Card>
          ) : null}

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

          {soonBirthdays.length > 0 ? (
            <>
              <SectionHeader title="Aniversários" icon="cake-variant-outline" action={onOpenBirthdays ? 'Ver todos' : undefined} onAction={onOpenBirthdays} />
              <ListCard>
                {soonBirthdays.map((birthday, index) => (
                  <ListRow
                    key={birthday.catechumenId}
                    icon="cake-variant-outline"
                    title={birthday.name}
                    subtitle={[birthday.className, `faz ${birthday.age} anos`].filter(Boolean).join(' · ')}
                    meta={formatDate(birthday.nextBirthday)}
                    chevron={false}
                    last={index === soonBirthdays.length - 1}
                  />
                ))}
              </ListCard>
            </>
          ) : null}

          <SectionHeader title="Próximos encontros" icon="calendar-clock-outline" />
          {upcoming.length === 0 ? (
            <EmptyState icon="calendar-blank-outline" title={focus?.meeting ? 'Sem mais encontros à vista' : 'Sem encontros à vista'} body="Quando houver um encontro marcado, aparece aqui." />
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
