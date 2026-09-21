import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, ChevronRight, FileText, Play, Users } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MeetingMaterialKind, MeetingMaterialRow } from '../meetings/meetingPresentation';
import { colors, radius, spacing, typography } from '../theme';

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
        <Users size={22} color={colors.white} strokeWidth={2.2} />
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
}: {
  active: MeetingTabKey;
  onChange: (tab: MeetingTabKey) => void;
}) {
  const tabs: { key: MeetingTabKey; label: string }[] = [
    { key: 'info', label: 'Info' },
    { key: 'attendance', label: 'Presença' },
    { key: 'content', label: 'Conteúdo' },
  ];

  return (
    <View style={styles.tabBar} testID="meeting-tab-bar">
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
            {selected ? <View style={styles.tabIndicator} /> : <View style={styles.tabIndicatorPlaceholder} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function MaterialIcon({ kind }: { kind: MeetingMaterialKind }) {
  const size = 20;
  switch (kind) {
    case 'pdf':
      return (
        <View style={[styles.materialIcon, { backgroundColor: '#FEE2E2' }]}>
          <FileText size={size} color="#DC2626" strokeWidth={2.2} />
        </View>
      );
    case 'video':
      return (
        <View style={[styles.materialIcon, { backgroundColor: '#EDE9FE' }]}>
          <Play size={size} color="#7C3AED" strokeWidth={2.2} />
        </View>
      );
    case 'bible':
      return (
        <View style={[styles.materialIcon, { backgroundColor: '#FFEDD5' }]}>
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
}: {
  row: MeetingMaterialRow;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.materialRow, pressed && onPress && { opacity: 0.94 }]}
      testID={`meeting-material-${row.id}`}
    >
      <MaterialIcon kind={row.kind} />
      <Text style={styles.materialLabel} numberOfLines={2}>{row.label}</Text>
      <ChevronRight size={20} color={colors.text.placeholder} />
    </Pressable>
  );
}

export function MeetingSectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function MeetingBodyText({ children }: { children: string }) {
  return <Text style={styles.bodyText}>{children}</Text>;
}

const styles = StyleSheet.create({
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  summaryAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { flex: 1 },
  summaryTitle: {
    ...typography.headingSm,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  summaryMeta: {
    fontSize: 14,
    color: colors.text.muted,
    lineHeight: 20,
  },
  themeHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[4],
    lineHeight: 28,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing[5],
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.tabInactive,
    marginBottom: spacing[2],
  },
  tabLabelActive: {
    color: colors.primary[800],
    fontWeight: '700',
  },
  tabIndicator: {
    height: 3,
    width: '100%',
    backgroundColor: colors.primary[800],
    borderRadius: 2,
  },
  tabIndicatorPlaceholder: {
    height: 3,
    width: '100%',
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.secondary,
    marginBottom: spacing[6],
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
    minHeight: 56,
  },
  materialIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
