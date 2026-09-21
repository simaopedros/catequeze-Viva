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
import { colors, radius, spacing, type } from '../theme';
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
        style={{ width: size, height: size, backgroundColor: colors.ink }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: colors.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.paper, fontFamily: type.bodyBold, fontSize: size * 0.34 }}>{initials(name)}</Text>
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
    <Pressable onPress={onPress} testID={testID} style={styles.metric} disabled={!onPress}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
        <View style={styles.heroBar} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroMeta}>{meta}</Text>
          <Text style={styles.heroTitle}>{title}</Text>
        </View>
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
      <Text style={[styles.bubbleBody, mine && { color: colors.paper }]}>{body}</Text>
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
  screen: { flex: 1, backgroundColor: colors.paper },
  screenContent: { padding: spacing.lg, paddingBottom: 48 },
  title: { color: colors.ink, fontSize: 40, fontFamily: type.bodyBold, lineHeight: 42, letterSpacing: -1 },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: type.bodyMedium,
  },
  section: {
    color: colors.ink,
    fontFamily: type.bodyBold,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderColor: colors.line,
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
  fieldLabel: { color: colors.ink, fontFamily: type.bodyBold, marginBottom: 6, fontSize: 11, letterSpacing: 1.4 },
  input: {
    backgroundColor: 'transparent',
    borderColor: colors.line,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 16,
    fontFamily: type.body,
    minHeight: 48,
  },
  error: { color: colors.danger, marginBottom: spacing.sm, fontFamily: type.body },
  loading: { alignItems: 'center', padding: spacing.xl, gap: 10 },
  metric: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  metricLabel: {
    color: colors.ink,
    fontFamily: type.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    flex: 1,
  },
  metricValue: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 28, width: 72, letterSpacing: -0.5 },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: 0,
    marginHorizontal: -16,
    marginBottom: spacing.lg,
  },
  heroBar: { height: 8, backgroundColor: colors.gold },
  heroCopy: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },
  heroTitle: { color: colors.paper, fontFamily: type.bodyBold, fontSize: 36, lineHeight: 38, letterSpacing: -0.8, marginTop: 8 },
  heroMeta: { color: colors.inkMuted, fontFamily: type.bodyMedium, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  heroAction: {
    backgroundColor: colors.gold,
    borderRadius: 0,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActionLabel: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 16 },
  person: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderBottomWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    marginBottom: 0,
  },
  personName: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 16 },
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.ink },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  bubbleAuthor: { color: colors.muted, fontFamily: type.bodyBold, marginBottom: 4, fontSize: 12 },
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
    width: '100%',
    paddingVertical: 12,
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  hubLabel: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 16 },
  hubHint: { color: colors.muted, fontFamily: type.body, fontSize: 13, marginTop: 4 },
});
