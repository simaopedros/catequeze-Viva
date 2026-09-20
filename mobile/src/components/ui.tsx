import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { copy } from '../copy/ptBR';
import { hapticSelection, hapticWarning } from '../feedback/haptics';
import { colors, fonts, motion, radius, spacing, touch, type } from '../theme';
import { useBrandFontsLoaded } from '../theme/fonts';

const colorMap = {
  ink: colors.ink,
  inkSoft: colors.inkSoft,
  inkMuted: colors.inkMuted,
  secondary: colors.textSecondary,
  gold: colors.gold,
  goldMuted: colors.goldMuted,
  danger: colors.danger,
  success: colors.success,
  paper: colors.paper,
  inverse: colors.white,
  canvas: colors.canvas,
} as const;

const familyMap = {
  regular: fonts.sans,
  medium: fonts.sansMedium,
  semibold: fonts.sansSemibold,
  bold: fonts.sansBold,
  display: fonts.display,
  displayBold: fonts.displayBold,
} as const;

type AppTextVariant = keyof typeof type | 'display';
type AppTextColor = keyof typeof colorMap;
type AppTextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export function AppText({
  variant = 'body',
  color = 'ink',
  weight,
  display,
  style,
  children,
  ...rest
}: TextProps & {
  variant?: AppTextVariant;
  color?: AppTextColor;
  weight?: AppTextWeight;
  display?: boolean;
}) {
  const fontsLoaded = useBrandFontsLoaded();
  const preset = type[variant === 'display' ? 'display' : variant];
  const familyKey =
    display || variant === 'display'
      ? weight === 'bold'
        ? 'displayBold'
        : 'display'
      : (weight ?? (preset.fontWeight === '700' ? 'bold' : 'regular'));
  return (
    <Text
      {...rest}
      style={[
        {
          color: colorMap[color],
          fontSize: preset.fontSize,
          lineHeight: preset.lineHeight,
          letterSpacing: preset.letterSpacing,
          fontWeight:
            weight === 'bold'
              ? '700'
              : weight === 'semibold'
                ? '600'
                : weight === 'medium'
                  ? '500'
                  : preset.fontWeight,
          fontFamily: fontsLoaded ? familyMap[familyKey] : undefined,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function PressableScale({
  children,
  onPress,
  disabled,
  haptic = true,
  style,
  testID,
  hitSlop,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  hitSlop?: number;
  accessibilityRole?: 'button' | 'link' | 'none';
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole === 'none' ? undefined : accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={hitSlop}
      testID={testID}
      disabled={disabled}
      onPress={() => {
        if (haptic) void hapticSelection();
        onPress?.();
      }}
      android_ripple={{ color: colors.goldSoft }}
      style={({ pressed }) => [
        {
          opacity: disabled ? 0.5 : pressed ? motion.pressedOpacity : 1,
          transform: [{ scale: pressed && !disabled ? motion.pressedScale : 1 }],
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function FadeInView({
  children,
  style,
  delay = 0,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
}) {
  return (
    <Animated.View entering={FadeIn.duration(motion.base).delay(delay)} style={style}>
      {children}
    </Animated.View>
  );
}

export function Screen({
  children,
  padded = true,
  testID,
  onRefresh,
  refreshing,
  tone = 'canvas',
}: {
  children: React.ReactNode;
  padded?: boolean;
  testID?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  tone?: 'canvas' | 'paper' | 'ink';
}) {
  const backgroundColor = tone === 'paper' ? colors.paper : tone === 'ink' ? colors.ink : colors.canvas;
  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        testID={testID}
        style={[styles.screen, { backgroundColor }]}
        contentContainerStyle={[styles.screenContent, padded && { padding: spacing.md }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={tone === 'ink' ? colors.gold : colors.ink}
              colors={[colors.gold]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function ScreenTitle({ title, subtitle, hero }: { title: string; subtitle?: string; hero?: boolean }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <AppText variant={hero ? 'display' : 'title'} display={hero} weight="bold">
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="bodySm" color="secondary" style={{ marginTop: spacing.xxs }}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

export function HeroBlock({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.hero} testID="hero-block">
      {kicker ? (
        <AppText variant="overline" color="gold" style={{ marginBottom: spacing.xs }}>
          {kicker}
        </AppText>
      ) : null}
      <AppText variant="display" display color="inverse">
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="bodySm" color="inkMuted" style={{ marginTop: spacing.xs }}>
          {subtitle}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ReaderFrame({ children }: { children: React.ReactNode }) {
  return <View style={styles.reader}>{children}</View>;
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
  variant?: 'primary' | 'ghost' | 'danger' | 'soft' | 'ink';
  testID?: string;
}) {
  const textColor =
    variant === 'danger' || variant === 'ink' ? 'inverse' : variant === 'primary' ? 'ink' : 'ink';
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      haptic={variant !== 'danger'}
      style={[
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        variant === 'soft' && styles.buttonSoft,
        variant === 'ink' && styles.buttonInk,
        disabled && styles.buttonDisabled,
      ]}
    >
      <AppText variant="body" weight="bold" color={textColor} style={{ textAlign: 'center' }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

export function Field({
  label,
  helper,
  error,
  ...props
}: TextInputProps & { label: string; helper?: string; error?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <AppText variant="caption" weight="semibold" style={{ marginBottom: spacing.xxs }}>
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, error ? styles.inputError : null, props.multiline ? styles.inputMultiline : null]}
        autoCapitalize="none"
        {...props}
      />
      {helper && !error ? (
        <AppText variant="caption" color="secondary" style={{ marginTop: spacing.xxs }}>
          {helper}
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="caption" color="danger" style={{ marginTop: spacing.xxs }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <AppText variant="bodySm" color="danger" style={{ marginBottom: spacing.sm }}>
      {message}
    </AppText>
  );
}

export function LoadingState({ label = copy.common.loading }: { label?: string }) {
  return (
    <View style={styles.loading} testID="loading-state">
      <ActivityIndicator color={colors.ink} />
      <AppText variant="bodySm" color="secondary">
        {label}
      </AppText>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  icon = 'leaf-outline',
}: {
  title: string;
  body: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={22} color={colors.goldMuted} />
      <AppText variant="titleSm" style={{ marginTop: spacing.xs, marginBottom: spacing.xxs }}>
        {title}
      </AppText>
      <AppText variant="bodySm" color="secondary">
        {body}
      </AppText>
    </View>
  );
}

export function ErrorState({ title, body }: { title: string; body: string }) {
  return <EmptyState title={title} body={body} icon="alert-circle-outline" />;
}

export function Chip({
  label,
  active,
  onPress,
  testID,
  hint,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  testID?: string;
  hint?: string;
}) {
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      accessibilityHint={hint}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
    >
      <AppText variant="caption" weight="bold" color={active ? 'inverse' : 'ink'}>
        {label}
      </AppText>
    </PressableScale>
  );
}

export function ListRow({
  title,
  meta,
  onPress,
  testID,
  accessory = true,
  selected,
  icon,
}: {
  title: string;
  meta?: string;
  onPress?: () => void;
  testID?: string;
  accessory?: boolean;
  selected?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const content = (
    <View style={styles.listRowInner}>
      {icon ? <Ionicons name={icon} size={20} color={colors.ink} /> : null}
      <View style={styles.flex}>
        <AppText variant="body" weight="semibold">
          {title}
        </AppText>
        {meta ? (
          <AppText variant="caption" color="secondary" style={{ marginTop: 2 }} numberOfLines={2}>
            {meta}
          </AppText>
        ) : null}
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
      ) : accessory && onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
      ) : null}
    </View>
  );
  if (!onPress) return <View style={styles.listRow}>{content}</View>;
  return (
    <PressableScale testID={testID} onPress={onPress} style={styles.listRow}>
      {content}
    </PressableScale>
  );
}

export function GroupedList({
  header,
  children,
  footer,
}: {
  header?: string;
  children: React.ReactNode;
  footer?: string;
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {header ? (
        <AppText variant="overline" color="secondary" style={styles.groupHeader}>
          {header}
        </AppText>
      ) : null}
      <View style={styles.group}>{children}</View>
      {footer ? (
        <AppText variant="caption" color="secondary" style={{ marginTop: spacing.xs, paddingHorizontal: spacing.xs }}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

export function SectionHeader({ title, style, testID }: { title: string; style?: StyleProp<TextStyle>; testID?: string }) {
  return (
    <AppText variant="overline" color="secondary" testID={testID} style={[{ marginBottom: spacing.sm, marginTop: spacing.md }, style]}>
      {title}
    </AppText>
  );
}

export function StatCard({ label, value, onPress }: { label: string; value: string | number; onPress?: () => void }) {
  const card = (
    <View style={styles.stat}>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
      <AppText variant="title" weight="bold" style={{ marginTop: spacing.xxs }}>
        {value}
      </AppText>
    </View>
  );
  if (!onPress) return card;
  return (
    <PressableScale onPress={onPress} style={styles.flex}>
      {card}
    </PressableScale>
  );
}

export function Banner({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.banner}>
      <AppText variant="bodySm" color="goldMuted">
        {children}
      </AppText>
    </View>
  );
}

export function TextButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <PressableScale testID={testID} onPress={onPress} hitSlop={8} style={{ paddingVertical: spacing.xs }}>
      <AppText variant="caption" weight="bold" color="goldMuted">
        {label}
      </AppText>
    </PressableScale>
  );
}

export function Fab({
  onPress,
  icon = 'add',
  testID,
  label,
}: {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  testID?: string;
  label?: string;
}) {
  return (
    <PressableScale testID={testID} onPress={onPress} style={styles.fab} accessibilityLabel={label}>
      <Ionicons name={icon} size={24} color={colors.ink} />
    </PressableScale>
  );
}

export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel = copy.common.confirm,
  cancelLabel = copy.common.cancel,
  danger,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.modalBackdrop} onPress={onCancel}>
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          <AppText variant="titleSm">{title}</AppText>
          <AppText variant="bodySm" color="secondary" style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
            {body}
          </AppText>
          <BrandButton
            variant={danger ? 'danger' : 'primary'}
            label={confirmLabel}
            onPress={() => {
              void hapticWarning();
              onConfirm();
            }}
          />
          <BrandButton variant="ghost" label={cancelLabel} onPress={onCancel} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.canvas },
  screenContent: { paddingBottom: spacing.xxl, flexGrow: 1 },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.elevated,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stroke,
    marginBottom: spacing.sm,
  },
  reader: {
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  button: {
    borderRadius: radius.md,
    paddingVertical: 14,
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  buttonPrimary: { backgroundColor: colors.gold },
  buttonInk: { backgroundColor: colors.ink },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.stroke },
  buttonDanger: { backgroundColor: colors.danger },
  buttonSoft: { backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.gold },
  buttonDisabled: { opacity: 0.5 },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.stroke,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: touch.min,
    color: colors.ink,
    fontSize: type.body.fontSize,
  },
  inputError: { borderColor: colors.danger },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  loading: { alignItems: 'center', padding: spacing.xl, gap: spacing.xs },
  empty: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.stroke,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipIdle: { backgroundColor: colors.elevated, borderColor: colors.stroke },
  listRow: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minHeight: touch.min,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.stroke,
  },
  listRowInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  group: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  groupHeader: {
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
  },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  banner: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...{
      shadowColor: colors.ink,
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.inkOverlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
});
