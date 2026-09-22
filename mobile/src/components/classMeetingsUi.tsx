import { ClipboardCheck, Compass, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatClassMeetingWhen } from './classDetailUi';
import { Card } from './ui';
import { colors, elevation, radius, spacing, typography } from '../theme';
import type { MeetingListItem } from '../meetings/meetingUtils';
import { meetingWhen } from '../meetings/meetingUtils';

export function ClassMeetingsHero({
  className,
  enrollmentCount,
  meetingCount,
  upcomingCount,
  onCreate,
}: {
  className?: string;
  enrollmentCount?: number;
  meetingCount: number;
  upcomingCount: number;
  onCreate: () => void;
}) {
  const label = className || 'Turma';
  return (
    <LinearGradient
      colors={[colors.primary[800], colors.primary[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
      testID="class-meetings-hero"
    >
      <View style={styles.heroTop}>
        <View style={styles.heroIcon}>
          <Compass size={22} color={colors.white} strokeWidth={2.2} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.heroEyebrow}>Encontros</Text>
          <Text style={styles.heroTitle} numberOfLines={2}>{label}</Text>
          {enrollmentCount != null ? (
            <Text style={styles.heroMeta}>{enrollmentCount} catequizandos</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.heroStats}>
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{meetingCount}</Text>
          <Text style={styles.heroStatLabel}>total</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{upcomingCount}</Text>
          <Text style={styles.heroStatLabel}>a seguir</Text>
        </View>
      </View>
      <Pressable
        testID="create-meeting-toggle"
        onPress={onCreate}
        style={styles.heroCta}
        accessibilityRole="button"
        accessibilityLabel="Criar encontro"
      >
        <Plus size={18} color={colors.primary[800]} strokeWidth={2.4} />
        <Text style={styles.heroCtaText}>Novo encontro</Text>
      </Pressable>
    </LinearGradient>
  );
}

export function ClassMeetingCard({
  meeting,
  onOpenMeeting,
  onOpenAttendance,
}: {
  meeting: MeetingListItem;
  onOpenMeeting: () => void;
  onOpenAttendance: () => void;
}) {
  const when = meetingWhen(meeting);
  const whenLabel = formatClassMeetingWhen(when);
  const title = meeting.title || 'Encontro';
  const theme = meeting.theme && meeting.theme !== title ? meeting.theme : undefined;

  return (
    <Card style={styles.meetingCard} elevated testID={`class-meeting-card-${meeting.id}`}>
      <Pressable onPress={onOpenMeeting} style={({ pressed }) => pressed && { opacity: 0.94 }}>
        <View style={styles.meetingHeader}>
          <View style={styles.meetingIcon}>
            <Compass size={18} color={colors.primary[800]} strokeWidth={2.2} />
          </View>
          <View style={styles.meetingHeaderText}>
            <Text style={styles.meetingWhen}>{whenLabel}</Text>
            <Text style={styles.meetingTitle}>{title}</Text>
            {theme ? <Text style={styles.meetingTheme}>{theme}</Text> : null}
          </View>
        </View>
      </Pressable>
      <View style={styles.meetingActions}>
        <Pressable onPress={onOpenMeeting} style={styles.actionGhost}>
          <Text style={styles.actionGhostText}>Detalhes</Text>
        </Pressable>
        <Pressable
          testID={`meeting-attendance-${meeting.id}`}
          onPress={onOpenAttendance}
          style={styles.actionPrimary}
        >
          <ClipboardCheck size={16} color={colors.white} strokeWidth={2.2} />
          <Text style={styles.actionPrimaryText}>Chamada</Text>
        </Pressable>
      </View>
    </Card>
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
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, minWidth: 0 },
  heroEyebrow: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.78)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroTitle: {
    ...typography.headingSm,
    color: colors.white,
  },
  heroMeta: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
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
  meetingCard: {
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  meetingHeader: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  meetingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingHeaderText: { flex: 1, minWidth: 0 },
  meetingWhen: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
  },
  meetingTitle: {
    ...typography.headingSm,
    color: colors.text.primary,
    marginTop: 2,
  },
  meetingTheme: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  meetingActions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionGhost: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionGhostText: {
    ...typography.labelSm,
    color: colors.primary[800],
    fontWeight: '600',
  },
  actionPrimary: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
    backgroundColor: colors.primary[800],
  },
  actionPrimaryText: {
    ...typography.labelSm,
    color: colors.white,
    fontWeight: '700',
  },
});
