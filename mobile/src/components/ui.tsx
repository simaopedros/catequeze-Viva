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
  secondary: colors.textSecondary,
  gold: colors.gold,
  goldMuted: colors.goldMuted,
  danger: colors.danger,
  success: colors.success,
  paper: colors.paper,
  inverse: colors.white,
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
  const familyKey = display || variant === 'display' ? (weight === 'bold' ? 'displayBold' : 'display') : (weight ?? (preset.fontWeight === '700' ? 'bold' : 'regular'));
  return (
    <Text
      {...rest}
      style={[
        {
          color: colorMap[color],
          fontSize: preset.fontSize,
          lineHeight: preset.lineHeight,
          letterSpacing: preset.letterSpacing,
          fontWeight: weight === 'bold' ? '700' : weight === 'semibold' ? '600' : weight === 'medium' ? '500' : preset.fontWeight,
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
}: {
  children: React.ReactNode;
  padded?: boolean;
  testID?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        testID={testID}
        style={styles.screen}
        contentContainerStyle={[styles.screenContent, padded && { padding: spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={colors.gold}
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

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <AppText variant="display" display weight="bold">
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
  variant?: 'primary' | 'ghost' | 'danger' | 'soft';
  testID?: string;
}) {
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
        disabled && styles.buttonDisabled,
      ]}
    >
      <AppText
        variant="body"
        weight="bold"
        color={variant === 'danger' ? 'inverse' : 'ink'}
        style={{ textAlign: 'center' }}
      >
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
      <ActivityIndicator color={colors.gold} />
      <AppText variant="bodySm" color="secondary">
        {label}
      </AppText>
    </View>
  );
}

export function EmptyState({ title, body, icon = 'leaf-outline' }: { title: string; body: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Card>
      <Ionicons name={icon} size={22} color={colors.goldMuted} />
      <AppText variant="titleSm" style={{ marginTop: spacing.xs, marginBottom: spacing.xxs }}>
        {title}
      </AppText>
      <AppText variant="bodySm" color="secondary">
        {body}
      </AppText>
    </Card>
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
      <AppText variant="caption" weight="bold" color={active ? 'ink' : 'inkSoft'}>
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
}: {
  title: string;
  meta?: string;
  onPress?: () => void;
  testID?: string;
  accessory?: boolean;
  selected?: boolean;
}) {
  const content = (
    <Card style={styles.listRowCard}>
      <View style={styles.listRowInner}>
        <View style={styles.flex}>
          <AppText variant="titleSm">{title}</AppText>
          {meta ? (
            <AppText variant="caption" color="secondary" style={{ marginTop: spacing.xxs }} numberOfLines={2}>
              {meta}
            </AppText>
          ) : null}
        </View>
        {selected ? (
          <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
        ) : accessory && onPress ? (
          <Ionicons name="chevron-forward" size={18} color={colors.goldMuted} />
        ) : null}
      </View>
    </Card>
  );
  if (!onPress) return content;
  return (
    <PressableScale testID={testID} onPress={onPress}>
      {content}
    </PressableScale>
  );
}

export function SectionHeader({ title, style, testID }: { title: string; style?: StyleProp<TextStyle>; testID?: string }) {
  return (
    <AppText variant="titleSm" testID={testID} style={[{ marginBottom: spacing.sm, marginTop: spacing.xs }, style]}>
      {title}
    </AppText>
  );
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card style={styles.flex}>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
      <AppText variant="display" display weight="bold" style={{ marginTop: spacing.xxs }}>
        {value}
      </AppText>
    </Card>
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
  screen: { flex: 1, backgroundColor: colors.paper },
  screenContent: { paddingBottom: spacing.xxl, flexGrow: 1 },
  card: {
    backgroundColor: colors.elevated,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stroke,
    marginBottom: spacing.md,
    shadowColor: colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  button: {
    borderRadius: radius.lg,
    paddingVertical: 14,
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  buttonPrimary: { backgroundColor: colors.gold },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.stroke },
  buttonDanger: { backgroundColor: colors.danger },
  buttonSoft: { backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.gold },
  buttonDisabled: { opacity: 0.5 },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.stroke,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: touch.min,
    color: colors.ink,
    fontSize: type.body.fontSize,
  },
  inputError: { borderColor: colors.danger },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  loading: { alignItems: 'center', padding: spacing.xl, gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  chipIdle: { backgroundColor: colors.elevated, borderColor: colors.stroke },
  listRowCard: { marginBottom: spacing.sm },
  listRowInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  banner: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.inkOverlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
});
