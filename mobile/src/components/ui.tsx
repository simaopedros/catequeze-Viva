import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, spacing } from '../theme';

export function Screen({
  children,
  padded = true,
  testID,
}: {
  children: React.ReactNode;
  padded?: boolean;
  testID?: string;
}) {
  return (
    <ScrollView
      testID={testID}
      style={styles.screen}
      contentContainerStyle={[styles.screenContent, padded && { padding: spacing.lg }]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function BrandButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          variant === 'ghost' && { color: colors.ink },
          variant === 'danger' && { color: colors.white },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCapitalize="none"
        {...props}
      />
    </View>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <View style={styles.loading} testID="loading-state">
      <ActivityIndicator color={colors.gold} />
      <Text style={styles.subtitle}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.subtitle}>{body}</Text>
    </Card>
  );
}

export function MenuRow({
  label,
  hint,
  onPress,
  testID,
  badge,
  compact = false,
  last = false,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  testID?: string;
  badge?: string;
  compact?: boolean;
  last?: boolean;
}) {
  if (compact) {
    return (
      <Pressable
        accessibilityRole="button"
        testID={testID}
        onPress={onPress}
        style={[styles.compactRow, !last && styles.compactRowBorder]}
      >
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.compactLabel}>{label}</Text>
          {hint ? <Text style={styles.compactHint}>{hint}</Text> : null}
          {badge ? <Text style={styles.compactBadge}>{badge}</Text> : null}
        </View>
        <Text style={styles.compactChevron}>›</Text>
      </Pressable>
    );
  }

  return (
    <Pressable accessibilityRole="button" testID={testID} onPress={onPress}>
      <Card>
        <Text style={styles.cardTitle}>{label}</Text>
        {hint ? <Text style={styles.subtitle}>{hint}</Text> : null}
        {badge ? <Text style={{ color: colors.goldDark, marginTop: 6 }}>{badge}</Text> : null}
      </Card>
    </Pressable>
  );
}

export function StatusChip({
  label,
  selected,
  onPress,
  tone = 'neutral',
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  tone?: 'success' | 'danger' | 'gold' | 'neutral';
}) {
  const selectedColor =
    tone === 'success' ? colors.success : tone === 'danger' ? colors.danger : tone === 'gold' ? colors.goldDark : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.chip,
        selected && { backgroundColor: selectedColor, borderColor: selectedColor },
      ]}
    >
      <Text style={[styles.chipLabel, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  screenContent: { paddingBottom: 48 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: 6, lineHeight: 22 },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md,
  },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonPrimary: { backgroundColor: colors.gold },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  fieldLabel: { color: colors.ink, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 16,
  },
  error: { color: colors.danger, marginBottom: spacing.sm },
  loading: { alignItems: 'center', padding: spacing.xl, gap: 10 },
  compactRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  compactRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  compactLabel: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  compactHint: { color: colors.muted, fontSize: 13, marginTop: 2 },
  compactBadge: { color: colors.goldDark, fontSize: 12, marginTop: 4 },
  compactChevron: { color: colors.muted, fontSize: 22, fontWeight: '300' },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  chipLabel: { color: colors.inkSoft, fontWeight: '600', fontSize: 13 },
});
