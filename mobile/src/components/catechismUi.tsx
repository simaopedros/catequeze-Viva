import {
  AlertTriangle,
  BookMarked,
  Church,
  Heart,
  Scale,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CATECHISM_PARTS,
  type CatechismPartKey,
} from '../catechism/catechismPresentation';
import { colors, elevation, radius, spacing, typography } from '../theme';

const PART_ICONS: Record<CatechismPartKey, LucideIcon> = {
  creed: Sparkles,
  sacraments: Church,
  commandments: Scale,
  prayer: Heart,
  virtues: BookMarked,
  sin: AlertTriangle,
};

export function CatechismHeroCard({ entryCount }: { entryCount?: number }) {
  return (
    <LinearGradient
      colors={[colors.primary[800], colors.primary[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
      testID="catechism-hero"
    >
      <View style={styles.heroTop}>
        <View style={styles.heroIconWrap}>
          <BookMarked size={22} color={colors.white} strokeWidth={2.2} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.heroEyebrow}>Catecismo</Text>
          <Text style={styles.heroTitle}>Catecismo da Igreja Católica</Text>
          <Text style={styles.heroMeta}>Consulte por parte ou pesquise palavras-chave.</Text>
        </View>
      </View>
      {entryCount != null && entryCount > 0 ? (
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>{entryCount} entradas nesta parte</Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

export function CatechismPartCard({
  partKey,
  title,
  summary,
  active,
  onPress,
}: {
  partKey: CatechismPartKey;
  title: string;
  summary: string;
  active?: boolean;
  onPress: () => void;
}) {
  const Icon = PART_ICONS[partKey];
  return (
    <Pressable
      onPress={onPress}
      style={[styles.partCard, active && styles.partCardActive]}
      testID={`catechism-part-${partKey}`}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
    >
      <View style={[styles.partIcon, active && styles.partIconActive]}>
        <Icon size={18} color={active ? colors.white : colors.primary[800]} strokeWidth={2.2} />
      </View>
      <Text style={[styles.partTitle, active && styles.partTitleActive]} numberOfLines={2}>
        {title}
      </Text>
      <Text style={[styles.partSummary, active && styles.partSummaryActive]} numberOfLines={2}>
        {summary}
      </Text>
    </Pressable>
  );
}

export function CatechismPartsGrid({
  activeKey,
  onSelect,
}: {
  activeKey?: string | null;
  onSelect: (key: CatechismPartKey) => void;
}) {
  return (
    <View style={styles.partsGrid} testID="catechism-parts-grid">
      {CATECHISM_PARTS.map((part) => (
        <View key={part.key} style={styles.partCell}>
          <CatechismPartCard
            partKey={part.key}
            title={part.title}
            summary={part.summary}
            active={activeKey === part.key}
            onPress={() => onSelect(part.key)}
          />
        </View>
      ))}
    </View>
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
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
  },
  heroEyebrow: {
    ...typography.labelSm,
    color: 'rgba(255,255,255,0.82)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroTitle: {
    ...typography.headingSm,
    color: colors.white,
    marginTop: 2,
  },
  heroMeta: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.88)',
    marginTop: spacing[2],
  },
  heroBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing[3],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroBadgeText: {
    ...typography.labelSm,
    color: colors.white,
    fontWeight: '600',
  },
  partsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  partCell: {
    width: '47%',
  },
  partCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 112,
    ...elevation.card,
  },
  partCardActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[800],
  },
  partIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  partIconActive: {
    backgroundColor: colors.primary[800],
  },
  partTitle: {
    ...typography.labelLg,
    color: colors.text.primary,
    marginBottom: 4,
  },
  partTitleActive: {
    color: colors.primary[800],
  },
  partSummary: {
    ...typography.bodySm,
    color: colors.text.muted,
  },
  partSummaryActive: {
    color: colors.primary[700],
  },
});
