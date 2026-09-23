import { Check, Clock, Search, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AttendanceSummaryStats } from '../meetings/attendancePresentation';
import { MeetingFooterButton, MeetingSummaryCard } from './meetingUi';
import { Avatar } from './ui';
import { attendanceStatus, colors, elevation, radius, spacing, type AttendanceStatusKey } from '../theme';

export function AttendanceHeaderCard({
  className,
  scheduleLabel,
  summary,
}: {
  className: string;
  scheduleLabel: string;
  summary: AttendanceSummaryStats;
}) {
  return (
    <View style={styles.headerCard} testID="attendance-header-card">
      <MeetingSummaryCard className={className} scheduleLabel={scheduleLabel} variant="embedded" />
      <AttendanceStatsGrid summary={summary} />
    </View>
  );
}

function AttendanceStatsGrid({ summary }: { summary: AttendanceSummaryStats }) {
  const cells = [
    { key: 'total', label: 'Total', value: summary.total, tone: 'total' as const },
    { key: 'present', label: 'Presentes', value: summary.present, tone: 'present' as const },
    { key: 'absent', label: 'Ausentes', value: summary.absent, tone: 'absent' as const },
    { key: 'justified', label: 'Justificados', value: summary.justified, tone: 'justified' as const },
  ];

  return (
    <View style={styles.statsRow} testID="attendance-stats">
      {cells.map((cell) => (
        <View
          key={cell.key}
          style={[styles.statCell, cell.tone === 'present' && styles.statPresent, cell.tone === 'absent' && styles.statAbsent, cell.tone === 'justified' && styles.statJustified]}
        >
          <Text style={[styles.statValue, cell.tone === 'total' && styles.statValueTotal, cell.tone === 'present' && styles.statValuePresent, cell.tone === 'absent' && styles.statValueAbsent, cell.tone === 'justified' && styles.statValueJustified]}>
            {cell.value}
          </Text>
          <Text style={styles.statLabel}>{cell.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function AttendanceSearchField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={styles.searchWrap} testID="attendance-search">
      <Search size={20} color={colors.text.placeholder} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Buscar catequizando..."
        placeholderTextColor={colors.text.placeholder}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );
}

function StatusIcon({ status }: { status: AttendanceStatusKey }) {
  const size = 16;
  const stroke = 2.4;
  switch (status) {
    case 'PRESENT':
      return <Check size={size} color={colors.success} strokeWidth={stroke} />;
    case 'ABSENT':
      return <X size={size} color={colors.danger} strokeWidth={stroke} />;
    case 'LATE':
      return <Clock size={size} color={colors.warning} strokeWidth={stroke} />;
    default:
      return <Check size={size} color={colors.info} strokeWidth={stroke} />;
  }
}

export function AttendanceStatusPill({
  status,
  onPress,
  disabled,
}: {
  status: AttendanceStatusKey;
  onPress: () => void;
  disabled?: boolean;
}) {
  const meta = attendanceStatus[status];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.statusPill,
        { backgroundColor: meta.bg, borderColor: meta.color },
        pressed && !disabled && { opacity: 0.92 },
      ]}
      testID={`attendance-status-pill-${status}`}
    >
      <StatusIcon status={status} />
      <Text style={[styles.statusPillLabel, { color: meta.color }]}>{meta.label}</Text>
    </Pressable>
  );
}

export function AttendanceStudentRow({
  name,
  subtitle,
  status,
  onCycleStatus,
  disabled,
  testID,
}: {
  name: string;
  subtitle?: string;
  status: AttendanceStatusKey;
  onCycleStatus: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.studentRow} testID={testID}>
      <Avatar name={name} size={44} />
      <View style={styles.studentText}>
        <Text style={styles.studentName} numberOfLines={1}>{name}</Text>
        {subtitle ? <Text style={styles.studentSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <AttendanceStatusPill status={status} onPress={onCycleStatus} disabled={disabled} />
    </View>
  );
}

export { MeetingFooterButton as AttendanceSaveButton };

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    marginBottom: spacing[4],
    overflow: 'hidden',
    ...elevation.card,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    marginTop: -spacing[2],
  },
  statCell: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    alignItems: 'center',
    backgroundColor: colors.primary[50],
  },
  statPresent: { backgroundColor: colors.successBg },
  statAbsent: { backgroundColor: colors.dangerBg },
  statJustified: { backgroundColor: '#F3F0FA' },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing[1],
  },
  statValueTotal: { color: colors.primary[800] },
  statValuePresent: { color: colors.success },
  statValueAbsent: { color: colors.danger },
  statValueJustified: { color: '#6B5B95' },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    textAlign: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    minHeight: 48,
    marginBottom: spacing[4],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: spacing[2],
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  studentText: {
    flex: 1,
    minWidth: 0,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary[900],
    marginBottom: 2,
  },
  studentSubtitle: {
    fontSize: 13,
    color: colors.text.muted,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
    borderWidth: 1,
    minWidth: 108,
    justifyContent: 'center',
  },
  statusPillLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
