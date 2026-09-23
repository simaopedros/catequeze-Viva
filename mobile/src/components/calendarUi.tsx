import { CalendarDays, Church, Compass, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CalendarItem } from '../calendar/types';
import { buildMonthGrid, isToday, WEEKDAY_LABELS, formatEventTime } from '../calendar/calendarMonth';
import { colors, elevation, radius, spacing, typography } from '../theme';
import { Card, FilterChip } from './ui';

export type CalendarFilter = 'all' | 'meeting' | 'liturgy';

export function CalendarHeroCard({
  monthLabel,
  meetingCount,
  liturgyCount,
  onToday,
  onCreate,
  canWrite,
}: {
  monthLabel: string;
  meetingCount: number;
  liturgyCount: number;
  onToday: () => void;
  onCreate?: () => void;
  canWrite?: boolean;
}) {
  const total = meetingCount + liturgyCount;
  return (
    <LinearGradient
      colors={[colors.primary[800], colors.primary[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
      testID="calendar-hero"
    >
      <View style={styles.heroTop}>
        <View style={styles.heroIconWrap}>
          <CalendarDays size={22} color={colors.white} strokeWidth={2.2} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.heroEyebrow}>Visão do mês</Text>
          <Text style={styles.heroTitle} numberOfLines={1}>{monthLabel}</Text>
        </View>
        <Pressable onPress={onToday} style={styles.todayChip} accessibilityRole="button">
          <Text style={styles.todayChipText}>Hoje</Text>
        </Pressable>
      </View>
      <View style={styles.heroStats}>
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{total}</Text>
          <Text style={styles.heroStatLabel}>eventos</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{meetingCount}</Text>
          <Text style={styles.heroStatLabel}>encontros</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{liturgyCount}</Text>
          <Text style={styles.heroStatLabel}>pastorais</Text>
        </View>
      </View>
      {canWrite && onCreate ? (
        <Pressable
          testID="calendar-create-event"
          onPress={onCreate}
          style={styles.heroCta}
          accessibilityRole="button"
          accessibilityLabel="Novo evento"
        >
          <Plus size={18} color={colors.primary[800]} strokeWidth={2.4} />
          <Text style={styles.heroCtaText}>Novo evento</Text>
        </Pressable>
      ) : null}
    </LinearGradient>
  );
}

export function CalendarFilterRow({
  value,
  onChange,
}: {
  value: CalendarFilter;
  onChange: (next: CalendarFilter) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
      testID="calendar-filters"
    >
      <FilterChip label="Todos" active={value === 'all'} onPress={() => onChange('all')} testID="calendar-filter-all" />
      <FilterChip
        label="Encontros"
        active={value === 'meeting'}
        onPress={() => onChange('meeting')}
        testID="calendar-filter-meetings"
      />
      <FilterChip
        label="Pastoral"
        active={value === 'liturgy'}
        onPress={() => onChange('liturgy')}
        testID="calendar-filter-liturgy"
      />
    </ScrollView>
  );
}

export function CalendarMonthGrid({
  month,
  items,
  selectedDay,
  onSelectDay,
}: {
  month: Date;
  items: CalendarItem[];
  selectedDay: number;
  onSelectDay: (day: number) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const cells = buildMonthGrid(month);

  const markersForDay = (day: number) => {
    const dayItems = items.filter((item) => {
      const d = new Date(item.date);
      return d.getFullYear() === year && d.getMonth() === monthIndex && d.getDate() === day;
    });
    return {
      meetings: dayItems.some((i) => i.kind === 'meeting'),
      liturgy: dayItems.some((i) => i.kind === 'liturgy'),
    };
  };

  return (
    <View testID="calendar-month-grid">
    <Card style={styles.gridCard} elevated>
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text key={`${label}-${index}`} style={styles.weekdayLabel}>{label}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((cell, index) => {
          if (cell.day === null) {
            return <View key={`empty-${index}`} style={styles.cell} />;
          }
          const day = cell.day;
          const active = day === selectedDay;
          const today = isToday(year, monthIndex, day);
          const markers = markersForDay(day);
          return (
            <Pressable
              key={cell.iso}
              onPress={() => onSelectDay(day)}
              style={[
                styles.cell,
                active && styles.cellActive,
                today && !active && styles.cellToday,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Dia ${day}`}
            >
              <Text style={[styles.cellDay, active && styles.cellDayActive, today && !active && styles.cellDayToday]}>
                {day}
              </Text>
              <View style={styles.markerRow}>
                {markers.meetings ? <View style={[styles.marker, styles.markerMeeting]} /> : null}
                {markers.liturgy ? <View style={[styles.marker, styles.markerLiturgy]} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.marker, styles.markerMeeting]} />
          <Text style={styles.legendText}>Encontro</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.marker, styles.markerLiturgy]} />
          <Text style={styles.legendText}>Pastoral</Text>
        </View>
      </View>
    </Card>
    </View>
  );
}

export function CalendarUpcomingStrip({
  items,
  onPressItem,
}: {
  items: CalendarItem[];
  onPressItem: (item: CalendarItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <View testID="calendar-upcoming">
      <Text style={styles.upcomingTitle}>Próximos no mês</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upcomingScroll}>
        {items.map((item) => (
          <Pressable key={`${item.kind}-${item.id}`} onPress={() => onPressItem(item)} style={styles.upcomingCard}>
            <Text style={styles.upcomingDate}>
              {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </Text>
            <Text style={styles.upcomingTime}>{formatEventTime(item.date)}</Text>
            <Text style={styles.upcomingName} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.upcomingKind}>{item.kind === 'meeting' ? 'Encontro' : 'Pastoral'}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function CalendarEventCard({
  item,
  onPress,
}: {
  item: CalendarItem;
  onPress: () => void;
}) {
  const isMeeting = item.kind === 'meeting';
  const Icon = isMeeting ? Compass : Church;
  const accent = isMeeting ? colors.info : colors.accent[700];
  const accentBg = isMeeting ? colors.infoBg : colors.accent[100];

  return (
    <Pressable onPress={onPress} style={styles.eventCardWrap} testID={`calendar-event-${item.id}`}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { backgroundColor: accent }]} />
        <View style={styles.timelineLine} />
      </View>
      <Card style={styles.eventCard} elevated>
        <View style={styles.eventHeader}>
          <View style={[styles.eventIcon, { backgroundColor: accentBg }]}>
            <Icon size={18} color={accent} strokeWidth={2.2} />
          </View>
          <View style={styles.eventHeaderText}>
            <Text style={styles.eventTime}>{formatEventTime(item.date)}</Text>
            <View style={[styles.kindBadge, { backgroundColor: accentBg }]}>
              <Text style={[styles.kindBadgeText, { color: accent }]}>
                {isMeeting ? 'Encontro' : 'Pastoral'}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.eventTitle}>{item.title}</Text>
        {isMeeting && (item.className || item.theme) ? (
          <Text style={styles.eventMeta} numberOfLines={2}>
            {[item.className ? `Turma ${item.className}` : null, item.theme].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {!isMeeting && item.description ? (
          <Text style={styles.eventMeta} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...elevation.card,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroEyebrow: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.78)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroTitle: {
    ...typography.headingSm,
    color: colors.white,
    textTransform: 'capitalize',
  },
  todayChip: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  todayChipText: {
    ...typography.labelSm,
    color: colors.white,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.22)',
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  heroStatLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroCta: {
    marginTop: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: spacing[3],
  },
  heroCtaText: {
    ...typography.labelLg,
    color: colors.primary[800],
  },
  filterRow: {
    gap: spacing[2],
    paddingBottom: spacing[3],
  },
  gridCard: {
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing[2],
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    color: colors.text.muted,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    maxHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  cellActive: {
    backgroundColor: colors.primary[800],
    borderRadius: radius.md,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: colors.primary[100],
    borderRadius: radius.md,
  },
  cellDay: {
    ...typography.labelSm,
    color: colors.text.primary,
  },
  cellDayActive: {
    color: colors.white,
    fontWeight: '700',
  },
  cellDayToday: {
    color: colors.primary[800],
    fontWeight: '700',
  },
  markerRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
    minHeight: 5,
  },
  marker: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  markerMeeting: {
    backgroundColor: colors.info,
  },
  markerLiturgy: {
    backgroundColor: colors.accent[500],
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[4],
    marginTop: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  legendText: {
    ...typography.caption,
    color: colors.text.muted,
  },
  upcomingTitle: {
    ...typography.labelLg,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  upcomingScroll: {
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  upcomingCard: {
    width: 132,
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.card,
  },
  upcomingDate: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
  },
  upcomingTime: {
    ...typography.labelSm,
    color: colors.primary[800],
    marginTop: 2,
  },
  upcomingName: {
    ...typography.bodySm,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: spacing[2],
  },
  upcomingKind: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: spacing[1],
  },
  eventCardWrap: {
    flexDirection: 'row',
    marginBottom: spacing[3],
  },
  timelineRail: {
    width: 20,
    alignItems: 'center',
    paddingTop: spacing[4],
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: 4,
    borderRadius: 1,
  },
  eventCard: {
    flex: 1,
    padding: spacing[3],
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventTime: {
    ...typography.labelSm,
    color: colors.text.muted,
  },
  kindBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  kindBadgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  eventTitle: {
    ...typography.headingSm,
    color: colors.text.primary,
  },
  eventMeta: {
    ...typography.bodySm,
    color: colors.text.muted,
    marginTop: spacing[1],
  },
});
