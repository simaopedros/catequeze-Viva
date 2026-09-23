import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  UserCheck,
  Users,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, elevation, radius, spacing, typography } from '../theme';
export function ClassSummaryCard({
  name,
  enrollmentCount,
}: {
  name: string;
  enrollmentCount: number;
}) {
  return (
    <View style={styles.summaryCard} testID="class-summary-card">
      <LinearGradient colors={['#F7B733', '#FC4A1A']} style={styles.summaryAvatar}>
        <Users size={22} color={colors.white} strokeWidth={2.2} />
      </LinearGradient>
      <View style={styles.summaryText}>
        <Text style={styles.summaryTitle}>{name}</Text>
        <Text style={styles.summaryMeta}>{enrollmentCount} catequizandos</Text>
      </View>
    </View>
  );
}

export function ClassActionButton({
  label,
  icon: Icon,
  onPress,
  testID,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.94 }]}
    >
      <View style={styles.actionIconWrap}>
        <Icon size={20} color={colors.primary[800]} strokeWidth={2.2} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

export function ClassMeetingPreviewRow({
  whenLabel,
  theme,
  onPress,
}: {
  whenLabel: string;
  theme?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.meetingRow, pressed && { opacity: 0.94 }]}>
      <View style={styles.meetingBell}>
        <Bell size={18} color={colors.primary[700]} />
      </View>
      <View style={styles.meetingBody}>
        <Text style={styles.meetingWhen}>{whenLabel}</Text>
        {theme ? <Text style={styles.meetingTheme}>Tema: {theme}</Text> : null}
      </View>
      <ChevronRight size={20} color={colors.text.placeholder} />
    </Pressable>
  );
}

export function formatClassMeetingWhen(dateValue?: string | Date | null) {
  if (!dateValue) return 'Data a definir';
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (Number.isNaN(date.getTime())) return String(dateValue);
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} ${time}`;
}

export const CLASS_DETAIL_ACTIONS = {
  catechumens: { label: 'Lista de catequizandos', icon: UserCheck },
  attendance: { label: 'Presença', icon: ClipboardCheck },
  meetings: { label: 'Encontros', icon: CalendarDays },
  families: { label: 'Famílias', icon: Users },
} as const;

const styles = StyleSheet.create({
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.primary[50],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#D6E2EC',
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  summaryAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { flex: 1, minWidth: 0 },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary[800],
  },
  summaryMeta: {
    ...typography.bodySm,
    color: colors.text.muted,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.primary[50],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#D6E2EC',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
    minHeight: 52,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.headingSm,
    color: colors.primary[800],
    flex: 1,
  },
  meetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    marginBottom: spacing[2],
    ...elevation.card,
  },
  meetingBell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingBody: { flex: 1, minWidth: 0 },
  meetingWhen: {
    ...typography.bodyMd,
    fontWeight: '600',
    color: colors.text.primary,
  },
  meetingTheme: {
    ...typography.bodySm,
    color: colors.text.muted,
    marginTop: 4,
  },
});
