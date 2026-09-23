import { BookOpen } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BibleTestamentFilter } from '../bible/biblePresentation';
import { colors, elevation, radius, spacing, typography } from '../theme';
import { FilterChip } from './ui';

export function BibleHeroCard({
  bookCount,
  otCount,
  ntCount,
}: {
  bookCount: number;
  otCount: number;
  ntCount: number;
}) {
  return (
    <LinearGradient
      colors={[colors.primary[800], colors.primary[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
      testID="bible-hero"
    >
      <View style={styles.heroTop}>
        <View style={styles.heroIconWrap}>
          <BookOpen size={22} color={colors.white} strokeWidth={2.2} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.heroEyebrow}>Bíblia</Text>
          <Text style={styles.heroTitle}>Sagrada Escritura</Text>
          <Text style={styles.heroMeta}>Leia um capítulo e partilhe versículos na Comunidade.</Text>
        </View>
      </View>
      <View style={styles.heroStats}>
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{bookCount}</Text>
          <Text style={styles.heroStatLabel}>livros</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{otCount}</Text>
          <Text style={styles.heroStatLabel}>AT</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{ntCount}</Text>
          <Text style={styles.heroStatLabel}>NT</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

export function BibleTestamentFilters({
  value,
  onChange,
}: {
  value: BibleTestamentFilter;
  onChange: (value: BibleTestamentFilter) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
      testID="bible-testament-filters"
    >
      <FilterChip
        testID="bible-filter-all"
        label="Todos"
        active={value === 'all'}
        onPress={() => onChange('all')}
      />
      <FilterChip
        testID="bible-filter-ot"
        label="Antigo"
        active={value === 'OT'}
        onPress={() => onChange('OT')}
      />
      <FilterChip
        testID="bible-filter-nt"
        label="Novo"
        active={value === 'NT'}
        onPress={() => onChange('NT')}
      />
    </ScrollView>
  );
}

export function BibleBookHeroCard({
  bookName,
  testamentLabel,
  chapterCount,
}: {
  bookName: string;
  testamentLabel: string;
  chapterCount: number;
}) {
  return (
    <LinearGradient
      colors={[colors.primary[800], colors.primary[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.bookHero}
      testID="bible-book-hero"
    >
      <Text style={styles.bookHeroEyebrow}>{testamentLabel}</Text>
      <Text style={styles.bookHeroTitle} numberOfLines={2}>{bookName}</Text>
      <Text style={styles.bookHeroMeta}>
        {chapterCount > 0 ? `${chapterCount} capítulos` : 'Capítulos'}
      </Text>
    </LinearGradient>
  );
}

export function BibleChapterGrid({
  chapters,
  onOpenChapter,
}: {
  chapters: { id?: string; number: number }[];
  onOpenChapter: (chapter: number) => void;
}) {
  return (
    <View style={styles.chapterGrid} testID="bible-chapter-grid">
      {chapters.map((chapter) => (
        <Pressable
          key={chapter.id || chapter.number}
          testID={`bible-chapter-${chapter.number}`}
          onPress={() => onOpenChapter(chapter.number)}
          style={styles.chapterCell}
          accessibilityRole="button"
          accessibilityLabel={`Capítulo ${chapter.number}`}
        >
          <Text style={styles.chapterCellText}>{chapter.number}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function BibleVerseCard({
  number,
  text,
  canPublish,
  onShare,
}: {
  number: number;
  text: string;
  canPublish?: boolean;
  onShare?: () => void;
}) {
  return (
    <View style={styles.verseCard} testID={`bible-verse-${number}`}>
      <View style={styles.verseHeader}>
        <View style={styles.verseBadge}>
          <Text style={styles.verseBadgeText}>{number}</Text>
        </View>
        {canPublish && onShare ? (
          <Pressable onPress={onShare} hitSlop={8} accessibilityRole="button">
            <Text style={styles.verseShare}>Partilhar</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.verseText}>{text}</Text>
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
    marginBottom: spacing[4],
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
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.md,
    paddingVertical: spacing[3],
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    ...typography.headingSm,
    color: colors.white,
  },
  heroStatLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterRow: {
    gap: spacing[2],
    paddingBottom: spacing[3],
  },
  bookHero: {
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...elevation.card,
  },
  bookHeroEyebrow: {
    ...typography.labelSm,
    color: 'rgba(255,255,255,0.82)',
    textTransform: 'uppercase',
  },
  bookHeroTitle: {
    ...typography.headingMd,
    color: colors.white,
    marginTop: spacing[1],
  },
  bookHeroMeta: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing[2],
  },
  chapterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chapterCell: {
    width: '18%',
    minWidth: 52,
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.card,
  },
  chapterCellText: {
    ...typography.labelLg,
    color: colors.primary[800],
    fontWeight: '700',
  },
  verseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.card,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  verseBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  verseBadgeText: {
    ...typography.labelLg,
    color: colors.primary[800],
  },
  verseShare: {
    ...typography.labelSm,
    color: colors.accent[700],
    fontWeight: '700',
  },
  verseText: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.text.primary,
  },
});
