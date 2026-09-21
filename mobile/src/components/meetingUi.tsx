import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, ChevronRight, FileText, Play, Users } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MeetingMaterialKind, MeetingMaterialRow } from '../meetings/meetingPresentation';
import { colors, elevation, radius, spacing, typography } from '../theme';

export type MeetingTabKey = 'info' | 'attendance' | 'content';

export function MeetingSummaryCard({
  className,
  scheduleLabel,
}: {
  className: string;
  scheduleLabel: string;
}) {
  return (
    <View style={styles.summaryCard} testID="meeting-summary-card">
      <LinearGradient colors={['#F7B733', '#FC4A1A']} style={styles.summaryAvatar}>
        <Users size={24} color={colors.white} strokeWidth={2.2} />
      </LinearGradient>
      <View style={styles.summaryText}>
        <Text style={styles.summaryTitle}>{className}</Text>
        <Text style={styles.summaryMeta}>{scheduleLabel}</Text>
      </View>
    </View>
  );
}

export function MeetingThemeHeading({ label }: { label: string }) {
  return (
    <Text style={styles.themeHeading} testID="meeting-theme-heading">
      {label}
    </Text>
  );
}

export function MeetingTabBar({
  active,
  onChange,
  horizontalInset = spacing[5],
}: {
  active: MeetingTabKey;
  onChange: (tab: MeetingTabKey) => void;
  /** Screen horizontal padding — tabs bleed edge-to-edge like the mock. */
  horizontalInset?: number;
}) {
  const tabs: { key: MeetingTabKey; label: string }[] = [
    { key: 'info', label: 'Info' },
    { key: 'attendance', label: 'Presença' },
    { key: 'content', label: 'Conteúdo' },
  ];

  return (
    <View style={[styles.tabBarWrap, { marginHorizontal: -horizontalInset }]} testID="meeting-tab-bar">
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              testID={`meeting-tab-${tab.key}`}
              onPress={() => onChange(tab.key)}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>{tab.label}</Text>
              <View style={styles.tabIndicatorSlot}>
                {selected ? <View style={styles.tabIndicator} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MaterialIcon({ kind }: { kind: MeetingMaterialKind }) {
  const size = 22;
  switch (kind) {
    case 'pdf':
      return (
        <View style={[styles.materialIcon, styles.materialIconPdf]}>
          <FileText size={size} color="#E11D48" strokeWidth={2.2} />
        </View>
      );
    case 'video':
      return (
        <View style={[styles.materialIcon, styles.materialIconVideo]}>
          <Play size={size} color="#7C3AED" strokeWidth={2.4} fill="#7C3AED" />
        </View>
      );
    case 'bible':
      return (
        <View style={[styles.materialIcon, styles.materialIconBible]}>
          <BookOpen size={size} color="#EA580C" strokeWidth={2.2} />
        </View>
      );
    default:
      return (
        <View style={[styles.materialIcon, { backgroundColor: colors.primary[50] }]}>
          <FileText size={size} color={colors.primary[700]} strokeWidth={2.2} />
        </View>
      );
  }
}

export function MeetingMaterialRowItem({
  row,
  onPress,
  grouped,
}: {
  row: MeetingMaterialRow;
  onPress?: () => void;
  grouped?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        grouped ? styles.materialRowGrouped : styles.materialRow,
        pressed && onPress && { opacity: 0.94 },
      ]}
      testID={`meeting-material-${row.id}`}
    >
      <MaterialIcon kind={row.kind} />
      <View style={styles.materialTextCol}>
        <Text style={styles.materialLabel} numberOfLines={2}>{row.label}</Text>
        {row.subtitle ? (
          <Text style={styles.materialSubtitle} numberOfLines={1}>{row.subtitle}</Text>
        ) : null}
      </View>
      <ChevronRight size={22} color="#B8C4D0" strokeWidth={2} />
    </Pressable>
  );
}

export function MeetingMaterialsGroup({
  rows,
  onPressRow,
}: {
  rows: MeetingMaterialRow[];
  onPressRow?: (row: MeetingMaterialRow) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <View style={styles.materialsGroup} testID="meeting-materials-group">
      {rows.map((row, index) => (
        <View key={row.id}>
          <MeetingMaterialRowItem
            row={row}
            grouped
            onPress={onPressRow ? () => onPressRow(row) : undefined}
          />
          {index < rows.length - 1 ? <View style={styles.materialDivider} /> : null}
        </View>
      ))}
    </View>
  );
}

export function MeetingSectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function MeetingBodyText({ children }: { children: string }) {
  return <Text style={styles.bodyText}>{children}</Text>;
}

export function MeetingFooterButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.footerButton, pressed && { opacity: 0.96 }]}
    >
      <Text style={styles.footerButtonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[5],
    ...elevation.card,
  },
  summaryAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { flex: 1 },
  summaryTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.primary[900],
    marginBottom: spacing[1],
  },
  summaryMeta: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.primary[700],
  },
  themeHeading: {
    ...typography.headingLg,
    color: colors.primary[900],
    marginBottom: spacing[4],
  },
  tabBarWrap: {
    marginBottom: spacing[6],
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F0F3F7',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.tabInactive,
    marginBottom: spacing[2],
  },
  tabLabelActive: {
    color: colors.primary[800],
    fontWeight: '700',
  },
  tabIndicatorSlot: {
    height: 3,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tabIndicator: {
    height: 3,
    width: 72,
    backgroundColor: colors.primary[800],
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.primary[900],
    marginBottom: spacing[3],
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: colors.primary[700],
    marginBottom: spacing[6],
  },
  materialsGroup: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    overflow: 'hidden',
    marginBottom: spacing[4],
    ...elevation.card,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
    minHeight: 60,
  },
  materialRowGrouped: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    minHeight: 60,
    backgroundColor: colors.surface,
  },
  materialDivider: {
    height: 1,
    backgroundColor: '#E8EDF2',
    marginLeft: spacing[4] + 44 + spacing[3],
  },
  materialIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialIconPdf: { backgroundColor: '#FFF1F2' },
  materialIconVideo: { backgroundColor: '#F3E8FF' },
  materialIconBible: { backgroundColor: '#FFEDD5' },
  materialTextCol: { flex: 1 },
  materialLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary[900],
    lineHeight: 22,
  },
  materialSubtitle: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
  footerButton: {
    backgroundColor: colors.primary[800],
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },
  footerButtonLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },
});
