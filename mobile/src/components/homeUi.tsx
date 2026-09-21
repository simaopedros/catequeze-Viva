import {
  BookOpen,
  Cake,
  ChevronRight,
  Church,
  Compass,
  GraduationCap,
  MessageCircle,
  Sparkles,
  Users,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, elevation, radius, spacing, typography } from '../theme';
import { Avatar, Card, PrimaryButton } from './ui';

export function HomeTopBar({
  day,
  weekday,
  month,
  firstName,
  workspaceName,
  avatarUrl,
  avatarName,
}: {
  day: number;
  weekday: string;
  month: string;
  firstName: string;
  workspaceName?: string;
  avatarUrl?: string | null;
  avatarName?: string;
}) {
  return (
    <View style={styles.topBar} testID="home-header">
      <View>
        <Text style={styles.dayNumber}>{day}</Text>
        <Text style={styles.weekday}>{weekday}</Text>
        <Text style={styles.month}>{month}</Text>
      </View>
      <View style={styles.greetingBlock}>
        <Text style={styles.greetingLine}>
          Olá, <Text style={styles.greetingName}>{firstName}</Text>
        </Text>
        {workspaceName ? <Text style={styles.workspace}>{workspaceName}</Text> : null}
      </View>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
      ) : (
        <Avatar name={avatarName || firstName} size={48} />
      )}
    </View>
  );
}

export function HomeTodayMeetingCard({
  empty,
  classLabel,
  timeRange,
  theme,
  onAttendance,
  onPress,
}: {
  empty?: boolean;
  classLabel?: string;
  timeRange?: string;
  theme?: string;
  onAttendance?: () => void;
  onPress?: () => void;
}) {
  if (empty) {
    return (
      <View testID="home-meeting-card">
      <Card style={styles.meetingCard} elevated>
        <View style={styles.meetingCardHeader}>
          <View style={styles.meetingHeaderIcon}>
            <Compass size={18} color={colors.accent[700]} />
          </View>
          <Text style={styles.meetingCardTitle}>Encontro hoje</Text>
        </View>
        <Text style={styles.emptyMeeting}>Sem encontro hoje.</Text>
      </Card>
      </View>
    );
  }

  return (
    <View testID="home-meeting-card">
    <Card style={styles.meetingCard} elevated>
      <View style={styles.meetingCardHeader}>
        <View style={styles.meetingHeaderIcon}>
          <Compass size={18} color={colors.accent[700]} />
        </View>
        <Text style={styles.meetingCardTitle}>Encontro hoje</Text>
      </View>
      <Pressable onPress={onPress} disabled={!onPress} style={styles.meetingBody}>
        <View style={styles.meetingThumb}>
          <Users size={22} color={colors.white} />
        </View>
        <View style={styles.meetingDetails}>
          <Text style={styles.meetingClassName}>{classLabel}</Text>
          {timeRange ? <Text style={styles.meetingTime}>{timeRange}</Text> : null}
          {theme ? <Text style={styles.meetingTheme}>Tema: {theme}</Text> : null}
        </View>
      </Pressable>
      {onAttendance ? (
        <PrimaryButton label="Fazer a chamada" onPress={onAttendance} variant="primary" />
      ) : null}
    </Card>
    </View>
  );
}

const STAT_CONFIG: { key: string; label: string; icon: LucideIcon; tint: string; bg: string }[] = [
  { key: 'classes', label: 'Turmas', icon: GraduationCap, tint: '#0D7C8C', bg: '#E6F4F6' },
  { key: 'catechumens', label: 'Catequizandos', icon: BookOpen, tint: '#C77A00', bg: '#FFF1D3' },
  { key: 'attendance', label: 'Presença', icon: Church, tint: '#217346', bg: '#EAF6EE' },
  { key: 'sacraments', label: 'Sacramentos', icon: Sparkles, tint: '#A65E00', bg: '#FFF8E8' },
];

export function HomeStatsRow({
  values,
  onPressClasses,
  onPressCatechumens,
}: {
  values: { classes: string | number; catechumens: string | number; attendance: string | number; sacraments: string | number };
  onPressClasses?: () => void;
  onPressCatechumens?: () => void;
}) {
  const handlers: Record<string, (() => void) | undefined> = {
    classes: onPressClasses,
    catechumens: onPressCatechumens,
  };

  return (
    <View testID="home-stats-row" style={styles.statsSection}>
      <Text style={styles.sectionTitle}>Hoje</Text>
      <View style={styles.statsRow}>
        {STAT_CONFIG.map((item) => {
          const Icon = item.icon;
          const value = values[item.key as keyof typeof values];
          const onPress = handlers[item.key];
          const tile = (
            <View style={styles.statTile}>
              <View style={[styles.statIconCircle, { backgroundColor: item.bg }]}>
                <Icon size={16} color={item.tint} />
              </View>
              <Text style={styles.statLabel} numberOfLines={2}>
                {item.label}
              </Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {value}
              </Text>
            </View>
          );
          if (!onPress) {
            return (
              <View key={item.key} style={styles.statTileWrap}>
                {tile}
              </View>
            );
          }
          return (
            <Pressable key={item.key} onPress={onPress} style={styles.statTileWrap}>
              {tile}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function alertVisual(type?: string, message?: string) {
  const lower = `${type || ''} ${message || ''}`.toLowerCase();
  if (lower.includes('anivers') || type === 'birthday') {
    return { Icon: Cake, bg: '#FDECEA', color: '#B42318' };
  }
  if (lower.includes('mensagem') || lower.includes('message')) {
    return { Icon: MessageCircle, bg: '#F0E9F8', color: '#6B3FA0' };
  }
  if (type === 'warning') {
    return { Icon: MessageCircle, bg: '#FFF3DF', color: colors.warning };
  }
  return { Icon: MessageCircle, bg: '#EAF3FA', color: colors.info };
}

export function HomeAlertsCard({
  items,
}: {
  items: { type?: string; message?: string; meta?: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <View testID="home-alerts">
      <Text style={styles.sectionTitle}>Alertas recentes</Text>
      <Card style={styles.alertsCard} elevated>
        {items.map((item, index) => {
          const visual = alertVisual(item.type, item.message);
          const Icon = visual.Icon;
          return (
            <View key={`alert-${index}`}>
              <View style={styles.alertRow}>
                <View style={[styles.alertIcon, { backgroundColor: visual.bg }]}>
                  <Icon size={18} color={visual.color} />
                </View>
                <View style={styles.alertText}>
                  <Text style={styles.alertMessage}>{item.message}</Text>
                  {item.meta ? <Text style={styles.alertMeta}>{item.meta}</Text> : null}
                </View>
                <ChevronRight size={20} color={colors.text.placeholder} />
              </View>
              {index < items.length - 1 ? <View style={styles.alertDivider} /> : null}
            </View>
          );
        })}
      </Card>
    </View>
  );
}

export function HomeClassesCarousel({
  classes,
  onOpenClass,
  onOpenAll,
}: {
  classes: { id: string; name: string; enrollmentCount?: number }[];
  onOpenClass?: (id: string) => void;
  onOpenAll?: () => void;
}) {
  return (
    <View testID="home-classes-carousel">
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Turmas</Text>
        {onOpenAll ? (
          <Pressable onPress={onOpenAll} hitSlop={8}>
            <Text style={styles.sectionLink}>Ver todas</Text>
          </Pressable>
        ) : null}
      </View>
      {classes.length === 0 ? (
        <Text style={styles.emptyClasses}>Sem turmas ativas.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classScroll}>
          {classes.map((klass) => (
            <Pressable
              key={klass.id}
              onPress={onOpenClass ? () => onOpenClass(klass.id) : undefined}
              style={styles.classChip}
            >
              <Text style={styles.classChipTitle}>{shortClassLabel(klass.name)}</Text>
              <Text style={styles.classChipMeta}>{klass.enrollmentCount ?? 0} catequizandos</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export function shortClassLabel(name: string) {
  const main = name.split(' - ')[0]?.trim() ?? name;
  const coded = main.match(/\b(\d+[A-Za-z])\b/i);
  if (coded) return coded[1];
  const words = main.split(/\s+/).filter(Boolean);
  return words[words.length - 1] ?? main;
}

export function formatMeetingTimeRange(startsAt?: string, endsAt?: string) {
  if (!startsAt) return undefined;
  const start = parseDate(startsAt);
  if (!start) return startsAt;
  const end = endsAt ? parseDate(endsAt) : null;
  const fmt = (d: Date) =>
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (end) return `${fmt(start)} - ${fmt(end)}`;
  return fmt(start);
}

function parseDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[5],
    gap: spacing[3],
  },
  dayNumber: { fontSize: 44, fontWeight: '700', color: colors.primary[800], lineHeight: 48 },
  weekday: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'capitalize',
  },
  month: { fontSize: 15, color: colors.text.muted, textTransform: 'capitalize' },
  greetingBlock: { flex: 1, alignItems: 'flex-end', paddingTop: 6 },
  greetingLine: { fontSize: 16, color: colors.text.primary, textAlign: 'right' },
  greetingName: { fontWeight: '700', color: colors.primary[800] },
  workspace: { fontSize: 13, color: colors.text.muted, marginTop: 4, textAlign: 'right' },
  avatarImage: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary[100] },
  meetingCard: { marginBottom: spacing[5], padding: spacing[4] },
  meetingCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] },
  meetingHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingCardTitle: { ...typography.headingSm, color: colors.primary[800] },
  emptyMeeting: { ...typography.bodyMd, color: colors.text.muted },
  meetingBody: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[4] },
  meetingThumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.accent[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingDetails: { flex: 1, justifyContent: 'center' },
  meetingClassName: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
  meetingTime: { ...typography.bodySm, color: colors.text.muted, marginTop: 4 },
  meetingTheme: { ...typography.bodySm, color: colors.text.secondary, marginTop: 2 },
  sectionTitle: { ...typography.headingSm, color: colors.primary[800], marginBottom: spacing[3] },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  sectionLink: { ...typography.labelLg, color: colors.primary[700] },
  statsSection: { marginBottom: spacing[4] },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing[2],
  },
  statTileWrap: {
    flex: 1,
    minWidth: 0,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[1],
    alignItems: 'center',
    minHeight: 100,
    ...elevation.card,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  statLabel: {
    fontSize: 10,
    lineHeight: 13,
    color: colors.text.muted,
    fontWeight: '600',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing[1],
    textAlign: 'center',
  },
  alertsCard: { paddingVertical: spacing[1], marginBottom: spacing[5] },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3], paddingHorizontal: spacing[2] },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertText: { flex: 1 },
  alertMessage: { ...typography.bodyMd, fontWeight: '600', color: colors.text.primary },
  alertMeta: { ...typography.bodySm, color: colors.text.muted, marginTop: 2 },
  alertDivider: { height: 1, backgroundColor: colors.border, marginLeft: 56 },
  classScroll: { gap: spacing[3], paddingBottom: spacing[2] },
  classChip: {
    width: 132,
    minHeight: 88,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    ...elevation.card,
  },
  classChipTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  classChipMeta: { ...typography.bodySm, color: colors.text.muted, marginTop: 6 },
  emptyClasses: { ...typography.bodyMd, color: colors.text.muted, marginBottom: spacing[4] },
});
