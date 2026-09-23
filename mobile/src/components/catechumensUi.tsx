import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Search } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CatechumenListItem } from '../catechumens/catechumensPresentation';
import { colors, radius, spacing } from '../theme';

const AVATAR_PALETTES = [
  { colors: ['#173B61', '#2E6BA8'] as const, text: colors.white },
  { colors: ['#F7B733', '#FC4A1A'] as const, text: colors.white },
  { colors: ['#2ECC71', '#27AE60'] as const, text: colors.white },
  { colors: ['#9B59B6', '#8E44AD'] as const, text: colors.white },
  { colors: ['#1ABC9C', '#16A085'] as const, text: colors.white },
];

export function CatechumensScreenHeader({
  count,
  subtitle: subtitleOverride,
}: {
  count?: number;
  subtitle?: string;
}) {
  const subtitle =
    subtitleOverride ??
    (typeof count === 'number'
      ? `${count} catequizando${count === 1 ? '' : 's'} na paróquia`
      : 'Consulta rápida por nome, turma ou família.');
  return (
    <View style={styles.headerBlock} testID="catechumens-header">
      <Text style={styles.pageSubtitle}>{subtitle}</Text>
    </View>
  );
}

export function CatechumensSearchBar({
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
        testID="catechumens-search"
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

export function CatechumenListItem({
  item,
  index,
  onPress,
  testID,
}: {
  item: CatechumenListItem;
  index: number;
  onPress: () => void;
  testID?: string;
}) {
  const palette = AVATAR_PALETTES[index % AVATAR_PALETTES.length];
  const subtitle = [item.className, item.familyName].filter(Boolean).join(' · ');

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
    >
      <LinearGradient colors={[...palette.colors]} style={styles.avatar}>
        <Text style={[styles.avatarText, { color: palette.text }]}>{item.initials}</Text>
      </LinearGradient>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {subtitle || 'Sem turma vinculada'}
        </Text>
      </View>
      <ChevronRight size={22} color={colors.text.placeholder} />
    </Pressable>
  );
}

export function CatechumenListDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  headerBlock: {
    marginBottom: spacing[3],
  },
  pageSubtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text.muted,
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
  searchIcon: {
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[1],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 14,
    color: colors.text.muted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 48 + spacing[3] + spacing[1],
  },
});
