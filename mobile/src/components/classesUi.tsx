import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Link2, Search, Users } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';
import { shortClassLabel } from './homeUi';

const AVATAR_PALETTES = [
  { colors: ['#F7B733', '#FC4A1A'] as const, text: colors.white },
  { colors: ['#2ECC71', '#27AE60'] as const, text: colors.white },
  { colors: ['#9B59B6', '#8E44AD'] as const, text: colors.white },
  { colors: ['#F39C12', '#E67E22'] as const, text: colors.white },
  { colors: ['#1ABC9C', '#16A085'] as const, text: colors.white },
];

export function ClassesScreenHeader({ onLinkPress }: { onLinkPress?: () => void }) {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.pageTitle}>Turmas</Text>
      {onLinkPress ? (
        <Pressable onPress={onLinkPress} hitSlop={12} accessibilityRole="button" testID="classes-link-action">
          <Link2 size={22} color={colors.primary[800]} strokeWidth={2.2} />
        </Pressable>
      ) : (
        <Link2 size={22} color={colors.primary[800]} strokeWidth={2.2} />
      )}
    </View>
  );
}

export function ClassesSearchBar({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={styles.searchWrap}>
      <Search size={18} color={colors.text.placeholder} style={styles.searchIcon} />
      <TextInput
        testID="classes-search"
        value={value}
        onChangeText={onChangeText}
        placeholder="Buscar turma..."
        placeholderTextColor={colors.text.placeholder}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );
}

export function ClassListItem({
  name,
  enrollmentCount,
  index,
  onPress,
  testID,
}: {
  name: string;
  enrollmentCount?: number;
  index: number;
  onPress: () => void;
  testID?: string;
}) {
  const palette = AVATAR_PALETTES[index % AVATAR_PALETTES.length];
  const badge = shortClassLabel(name);
  const showIcon = badge.length > 3;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
    >
      <LinearGradient colors={[...palette.colors]} style={styles.avatar}>
        {showIcon ? (
          <Users size={20} color={palette.text} strokeWidth={2.2} />
        ) : (
          <Text style={[styles.avatarText, { color: palette.text }]}>{badge}</Text>
        )}
      </LinearGradient>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>{name}</Text>
        <Text style={styles.rowSubtitle}>{enrollmentCount ?? 0} catequizandos</Text>
      </View>
      <ChevronRight size={22} color={colors.text.placeholder} />
    </Pressable>
  );
}

export function ClassListDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary[800],
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    minHeight: 48,
    marginBottom: spacing[2],
  },
  searchIcon: { marginRight: spacing[2] },
  searchInput: {
    flex: 1,
    fontSize: typography.bodyMd.fontSize,
    color: colors.text.primary,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: {
    ...typography.headingSm,
    color: colors.text.primary,
  },
  rowSubtitle: {
    ...typography.bodySm,
    color: colors.text.muted,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 48 + spacing[3],
  },
});
