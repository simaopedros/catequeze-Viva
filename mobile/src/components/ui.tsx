import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, radius, shadow, spacing, type } from '../theme';
import { initials } from '../format';

export function Screen({
  children,
  padded = true,
  testID,
  refreshing,
  onRefresh,
  contentStyle,
}: {
  children: React.ReactNode;
  padded?: boolean;
  testID?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
}) {
  return (
    <ScrollView
      testID={testID}
      style={styles.screen}
      contentContainerStyle={[styles.screenContent, padded && { padding: spacing.lg }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.gold} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

export function ListScreen<T>({
  data,
  renderItem,
  keyExtractor,
  testID,
  header,
  empty,
  refreshing,
  onRefresh,
  onEndReached,
}: {
  data: T[];
  renderItem: (item: T) => React.ReactElement | null;
  keyExtractor: (item: T) => string;
  testID?: string;
  header?: React.ReactElement | null;
  empty?: React.ReactElement | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
}) {
  return (
    <FlatList
      testID={testID}
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => renderItem(item)}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      keyboardShouldPersistTaps="handled"
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.gold} />
        ) : undefined
      }
    />
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

export function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
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
          variant === 'primary' && { color: colors.ink },
          variant === 'ghost' && { color: colors.ink },
          variant === 'danger' && { color: colors.white },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" {...props} />
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

export function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    <Card style={{ borderColor: colors.danger }}>
      <Text style={[styles.cardTitle, { color: colors.danger }]}>{title}</Text>
      <Text style={styles.subtitle}>{body}</Text>
    </Card>
  );
}

export function Avatar({ name, size = 40, imageUrl }: { name: string; size?: number; imageUrl?: string | null }) {
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        accessibilityIgnoresInvertColors
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.line }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.goldLight, fontFamily: type.bodyBold, fontSize: size * 0.34 }}>{initials(name)}</Text>
    </View>
  );
}

export function MetricTile({
  label,
  value,
  onPress,
  testID,
}: {
  label: string;
  value: string | number;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable onPress={onPress} testID={testID} style={{ flex: 1 }} disabled={!onPress}>
      <Card style={{ marginBottom: 0 }}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </Card>
    </Pressable>
  );
}

export function EncounterCard({
  title,
  meta,
  actionLabel,
  onAction,
  onPress,
  testID,
}: {
  title: string;
  meta: string;
  actionLabel?: string;
  onAction?: () => void;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable onPress={onPress} testID={testID} disabled={!onPress && !onAction}>
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>Encontro de hoje</Text>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroMeta}>{meta}</Text>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} style={styles.heroAction} testID="encounter-action">
            <Text style={styles.heroActionLabel}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

export function PersonRow({
  name,
  detail,
  onPress,
  testID,
}: {
  name: string;
  detail?: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable onPress={onPress} testID={testID} style={styles.person}>
      <Avatar name={name} />
      <View style={{ flex: 1 }}>
        <Text style={styles.personName}>{name}</Text>
        {detail ? <Text style={styles.subtitle}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

export function ChatBubble({
  mine,
  author,
  body,
}: {
  mine?: boolean;
  author: string;
  body: string;
}) {
  return (
    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
      {!mine ? <Text style={styles.bubbleAuthor}>{author}</Text> : null}
      <Text style={[styles.bubbleBody, mine && { color: colors.ink }]}>{body}</Text>
    </View>
  );
}

export const ATTENDANCE_OPTIONS = [
  { value: 'PRESENT', label: 'Presente' },
  { value: 'ABSENT', label: 'Falta' },
  { value: 'LATE', label: 'Atraso' },
  { value: 'JUSTIFIED', label: 'Justificada' },
] as const;

export function StatusPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.statusRow}>
      {ATTENDANCE_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            testID={`status-${option.value}`}
            style={[styles.statusChip, active && styles.statusChipActive]}
          >
            <Text style={[styles.statusLabel, active && { color: colors.ink }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function HubTile({
  label,
  hint,
  onPress,
  testID,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable onPress={onPress} testID={testID} style={styles.hubTile}>
      <Text style={styles.hubLabel}>{label}</Text>
      {hint ? <Text style={styles.hubHint}>{hint}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  screenContent: { padding: spacing.lg, paddingBottom: 48 },
  title: { color: colors.ink, fontSize: 32, fontFamily: type.display, lineHeight: 36 },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: 4, lineHeight: 22, fontFamily: type.body },
  section: {
    color: colors.ink,
    fontFamily: type.bodyBold,
    fontSize: 18,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cardTitle: { color: colors.ink, fontSize: 18, fontFamily: type.bodyBold, marginBottom: 6 },
  button: {
    borderRadius: radius.sm,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonPrimary: { backgroundColor: colors.gold },
  buttonGhost: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { fontFamily: type.bodyBold, fontSize: 16 },
  fieldLabel: { color: colors.ink, fontFamily: type.bodyMedium, marginBottom: 6 },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 16,
    fontFamily: type.body,
    minHeight: 48,
  },
  error: { color: colors.danger, marginBottom: spacing.sm, fontFamily: type.body },
  loading: { alignItems: 'center', padding: spacing.xl, gap: 10 },
  metricLabel: { color: colors.muted, fontFamily: type.body, fontSize: 13 },
  metricValue: { color: colors.ink, fontFamily: type.display, fontSize: 28, marginTop: 4 },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroKicker: { color: colors.goldLight, fontFamily: type.bodyBold, letterSpacing: 0.4, fontSize: 12 },
  heroTitle: { color: colors.cream, fontFamily: type.display, fontSize: 30, marginTop: 6 },
  heroMeta: { color: colors.inkMuted, fontFamily: type.body, marginTop: 6, lineHeight: 20 },
  heroAction: {
    marginTop: spacing.md,
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActionLabel: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 16 },
  person: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  personName: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 16 },
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.goldLight },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  bubbleAuthor: { color: colors.goldDark, fontFamily: type.bodyBold, marginBottom: 4, fontSize: 12 },
  bubbleBody: { color: colors.inkSoft, fontFamily: type.body, fontSize: 16, lineHeight: 22 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  statusChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 10,
    minHeight: 36,
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  statusChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  statusLabel: { color: colors.muted, fontFamily: type.bodyMedium, fontSize: 13 },
  hubTile: {
    width: '47%',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    minHeight: 88,
    ...shadow.card,
  },
  hubLabel: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 16 },
  hubHint: { color: colors.muted, fontFamily: type.body, fontSize: 13, marginTop: 4 },
});
