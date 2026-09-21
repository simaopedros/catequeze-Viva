import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colors,
  contentHorizontalPadding,
  radius,
  spacing,
  typography,
  attendanceStatus,
  type AttendanceStatusKey,
  elevation,
} from '../theme';

export function Screen({
  children,
  padded = true,
  testID,
  scroll = true,
  refreshing,
  onRefresh,
  variant = 'default',
}: {
  children: React.ReactNode;
  padded?: boolean;
  testID?: string;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  variant?: 'default' | 'fullBleed' | 'form' | 'feed';
}) {
  const { width } = useWindowDimensions();
  const horizontal = variant === 'fullBleed' ? 0 : contentHorizontalPadding(width);
  const contentStyle = [
    styles.screenContent,
    padded && { paddingHorizontal: horizontal, paddingTop: spacing[4] },
    variant === 'form' && { paddingBottom: spacing[12] },
  ];

  if (!scroll) {
    return (
      <SafeAreaView testID={testID} style={styles.screen} edges={['left', 'right']}>
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView testID={testID} style={styles.screen} edges={['left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={contentStyle}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary[800]} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: spacing[4] }}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, style, elevated }: { children: React.ReactNode; style?: ViewStyle; elevated?: boolean }) {
  return <View style={[styles.card, elevated && elevation.card, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  testID,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
  testID?: string;
  fullWidth?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        fullWidth && { alignSelf: 'stretch' },
        variant === 'primary' && styles.buttonPrimary,
        variant === 'accent' && styles.buttonAccent,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'accent' ? colors.text.primary : colors.white} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant === 'accent' && { color: colors.text.primary },
            variant === 'secondary' && { color: colors.primary[800] },
            variant === 'ghost' && { color: colors.primary[700] },
            variant === 'danger' && { color: colors.danger },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** @deprecated use PrimaryButton */
export const BrandButton = PrimaryButton;

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={{ marginBottom: spacing[4] }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.text.placeholder}
        style={[styles.input, error && styles.inputError]}
        autoCapitalize="none"
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function SearchInput(props: TextInputProps & { label?: string }) {
  const { label, ...rest } = props;
  return (
    <View style={{ marginBottom: spacing[4] }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.text.placeholder}
        style={styles.searchInput}
        autoCapitalize="none"
        {...rest}
      />
    </View>
  );
}

export function PasswordInput({
  label,
  value,
  onChangeText,
  ...props
}: Omit<TextInputProps, 'secureTextEntry'> & { label: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ marginBottom: spacing[4] }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.passwordRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          placeholderTextColor={colors.text.placeholder}
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          autoCapitalize="none"
          {...props}
        />
        <Pressable onPress={() => setVisible((v) => !v)} style={styles.passwordToggle}>
          <Text style={styles.sectionAction}>{visible ? 'Ocultar' : 'Mostrar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Avatar({ name, size = 40 }: { name?: string; size?: number }) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: colors.primary[800], fontWeight: '700', fontSize: size * 0.38 }}>{initial}</Text>
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  onPress,
  right,
  avatarName,
  testID,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  avatarName?: string;
  testID?: string;
}) {
  const content = (
    <View style={styles.listRow}>
      {avatarName ? <Avatar name={avatarName} size={40} /> : null}
      <View style={{ flex: 1, marginLeft: avatarName ? spacing[3] : 0 }}>
        <Text style={styles.listTitle}>{title}</Text>
        {subtitle ? <Text style={styles.listSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Text style={styles.chevron}>›</Text> : null)}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.92 }}>
      {content}
    </Pressable>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function FilterChip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export function StatCard({
  label,
  value,
  onPress,
  disabled,
}: {
  label: string;
  value: string | number;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const inner = (
    <Card style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
  if (!onPress || disabled) return inner;
  return <Pressable onPress={onPress}>{inner}</Pressable>;
}

export function MeetingHighlightCard({
  className,
  title,
  timeLabel,
  onPress,
  onAttendance,
  empty,
}: {
  className?: string;
  title?: string;
  timeLabel?: string;
  onPress?: () => void;
  onAttendance?: () => void;
  empty?: boolean;
}) {
  if (empty) {
    return (
      <Card style={styles.meetingCard}>
        <Text style={styles.listSubtitle}>Sem encontro hoje.</Text>
      </Card>
    );
  }
  return (
    <Card style={styles.meetingCard}>
      <View style={styles.meetingAccent} />
      {className ? <Text style={styles.meetingClass}>{className}</Text> : null}
      <Text style={styles.meetingTitle}>{title}</Text>
      {timeLabel ? <Text style={styles.listSubtitle}>{timeLabel}</Text> : null}
      {onAttendance ? (
        <PrimaryButton label="Fazer a chamada" onPress={onAttendance} variant="secondary" />
      ) : null}
      {onPress && !onAttendance ? (
        <PrimaryButton label="Ver encontro" onPress={onPress} variant="ghost" />
      ) : null}
    </Card>
  );
}

export function PresenceSelector({
  value,
  onChange,
  disabled,
  testID,
}: {
  value: AttendanceStatusKey;
  onChange: (status: AttendanceStatusKey) => void;
  disabled?: boolean;
  testID?: string;
}) {
  const keys = Object.keys(attendanceStatus) as AttendanceStatusKey[];
  return (
    <View style={styles.presenceRow} testID={testID}>
      {keys.map((key) => {
        const meta = attendanceStatus[key];
        const active = value === key;
        return (
          <Pressable
            key={key}
            disabled={disabled}
            onPress={() => onChange(key)}
            style={[
              styles.presenceChip,
              active && { backgroundColor: meta.bg, borderColor: meta.color },
            ]}
          >
            <Text style={[styles.presenceLabel, active && { color: meta.color, fontWeight: '700' }]}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Skeleton({ height = 16, width, style }: { height?: number; width?: number; style?: ViewStyle }) {
  return <View style={[styles.skeleton, { height, width: width ?? '100%' }, style]} />;
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <View style={styles.loading} testID="loading-state">
      <ActivityIndicator color={colors.primary[800]} />
      <Text style={styles.subtitle}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  description,
}: {
  title: string;
  body?: string;
  description?: string;
}) {
  const detail = description ?? body;
  return (
    <View style={styles.emptyState}>
      <Text style={styles.cardTitle}>{title}</Text>
      {detail ? <Text style={styles.subtitle}>{detail}</Text> : null}
    </View>
  );
}

export function ErrorState({
  title,
  onRetry,
}: {
  title: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.cardTitle}>{title}</Text>
      {onRetry ? <PrimaryButton label="Tentar novamente" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}

export function BrandMark() {
  return (
    <View style={styles.brandMark}>
      <Text style={styles.brandMarkText}>Catequese Viva</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  screenContent: { paddingBottom: spacing[12] },
  title: { ...typography.headingLg, color: colors.text.primary },
  subtitle: { ...typography.bodyMd, color: colors.text.muted, marginTop: spacing[1] },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
    marginTop: spacing[2],
  },
  sectionTitle: { ...typography.headingSm, color: colors.text.primary },
  sectionAction: { ...typography.labelLg, color: colors.primary[700] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing[3],
  },
  cardTitle: { ...typography.headingSm, color: colors.text.primary, marginBottom: spacing[1] },
  button: {
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  buttonPrimary: { backgroundColor: colors.primary[800] },
  buttonAccent: { backgroundColor: colors.accent[500] },
  buttonSecondary: { backgroundColor: colors.primary[50], borderWidth: 1, borderColor: '#D6E2EC' },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonDanger: { backgroundColor: colors.dangerBg },
  buttonDisabled: { opacity: 0.45 },
  buttonLabel: { ...typography.labelLg, color: colors.white },
  fieldLabel: { ...typography.bodySm, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing[1] },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: 50,
    paddingVertical: 12,
    color: colors.text.primary,
    fontSize: typography.bodyMd.fontSize,
  },
  inputError: { borderColor: colors.danger },
  searchInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: 48,
    color: colors.text.primary,
    fontSize: typography.bodyMd.fontSize,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  passwordToggle: { paddingHorizontal: spacing[2], minHeight: 44, justifyContent: 'center' },
  error: { color: colors.danger, marginBottom: spacing[2], fontSize: 13 },
  loading: { alignItems: 'center', padding: spacing[8], gap: spacing[2] },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[5],
    marginBottom: spacing[3],
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listTitle: { ...typography.headingSm, color: colors.text.primary },
  listSubtitle: { ...typography.bodySm, color: colors.text.muted, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.text.placeholder, paddingHorizontal: spacing[2] },
  detailRow: {
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { ...typography.labelSm, color: colors.text.muted, marginBottom: 4 },
  detailValue: { fontSize: 15, fontWeight: '500', color: colors.text.primary },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing[2],
  },
  chipActive: { backgroundColor: colors.primary[800], borderColor: colors.primary[800] },
  chipLabel: { ...typography.bodySm, fontWeight: '600', color: colors.text.secondary },
  chipLabelActive: { color: colors.white },
  statCard: { flex: 1, minHeight: 100, marginBottom: 0 },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.text.primary },
  statLabel: { ...typography.bodySm, color: colors.text.muted, marginTop: spacing[1] },
  meetingCard: { overflow: 'hidden', paddingLeft: spacing[4] + 4 },
  meetingAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.accent[500],
  },
  meetingClass: { ...typography.bodySm, fontWeight: '600', color: colors.primary[800] },
  meetingTitle: { fontSize: 19, fontWeight: '700', color: colors.text.primary, marginTop: 4 },
  presenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1], marginTop: spacing[2] },
  presenceChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  presenceLabel: { fontSize: 11, color: colors.text.secondary },
  skeleton: { backgroundColor: colors.skeleton, borderRadius: radius.md },
  avatar: {
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMark: { alignItems: 'center', marginBottom: spacing[6], marginTop: spacing[8] },
  brandMarkText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary[900],
  },
});
