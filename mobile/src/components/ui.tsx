import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Chip,
  Dialog,
  FAB,
  HelperText,
  Portal,
  Searchbar,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 22, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

export function Screen({
  children,
  padded = true,
  testID,
  refreshing,
  onRefresh,
  scroll = true,
  fab,
  safeTop,
  safeBottom,
  fabInset,
}: {
  children: React.ReactNode;
  padded?: boolean;
  testID?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
  fab?: React.ReactNode;
  /** Telas raiz (tabs) sem header nativo precisam do inset superior. */
  safeTop?: boolean;
  /** Espaço extra acima da tab bar (telas das tabs). */
  safeBottom?: boolean;
  /** Reserva altura para FAB absoluto no fim do scroll. */
  fabInset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const topPad = safeTop ? insets.top + spacing.sm : 0;
  const bottomPad =
    (safeBottom ? insets.bottom + 72 : 0) + (fabInset || fab ? 72 : 0) + (padded ? spacing.md : 0);
  const fabBottom = (safeBottom ? insets.bottom + 72 : spacing.lg) + spacing.sm;
  if (!scroll) {
    return (
      <View
        testID={testID}
        style={[
          styles.screen,
          padded && { padding: spacing.md },
          { paddingTop: topPad + (padded ? spacing.md : 0), paddingBottom: bottomPad },
        ]}
      >
        {children}
        {fab ? <View style={[styles.fabWrap, { bottom: fabBottom }]}>{fab}</View> : null}
      </View>
    );
  }
  return (
    <View style={styles.screen}>
      <ScrollView
        testID={testID}
        style={styles.screen}
        contentContainerStyle={[
          styles.screenContent,
          padded && { padding: spacing.md },
          { paddingTop: topPad + (padded ? spacing.md : 0), paddingBottom: bottomPad },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
      {fab ? <View style={[styles.fabWrap, { bottom: fabBottom }]}>{fab}</View> : null}
    </View>
  );
}

export function ScreenTitle({
  title,
  subtitle,
  eyebrow,
  action,
  compact,
}: {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  /** Oculta o título grande quando o header nativo já mostra o nome do ecrã. */
  compact?: boolean;
}) {
  if (compact && !subtitle && !eyebrow && !action) return null;
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        {title && !compact ? (
          <Text variant="headlineMedium" style={styles.title}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant={compact && !title ? 'bodyLarge' : 'bodyMedium'} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  icon,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  icon?: IconName;
}) {
  return (
    <View style={styles.sectionHeader}>
      {icon ? <Icon name={icon} size={18} color={colors.goldDark} /> : null}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {title}
      </Text>
      {action && onAction ? (
        <Button compact mode="text" onPress={onAction} textColor={colors.goldDark} labelStyle={styles.sectionAction}>
          {action}
        </Button>
      ) : null}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  testID,
  tone = 'surface',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  testID?: string;
  tone?: 'surface' | 'paper' | 'ink' | 'gold';
}) {
  const toneStyle =
    tone === 'ink'
      ? { backgroundColor: colors.ink, borderColor: colors.ink }
      : tone === 'gold'
        ? { backgroundColor: colors.goldLight, borderColor: colors.goldLight }
        : tone === 'paper'
          ? { backgroundColor: colors.paper }
          : null;
  const flattened = StyleSheet.flatten(style);
  const layoutStyle =
    flattened && typeof flattened === 'object'
      ? {
          ...(flattened.flex != null ? { flex: flattened.flex, width: '100%' as const } : null),
          ...(flattened.minWidth != null ? { minWidth: flattened.minWidth } : null),
          ...(flattened.alignSelf != null ? { alignSelf: flattened.alignSelf } : null),
        }
      : undefined;
  const content = (
    <Surface mode="flat" elevation={0} style={[styles.card, toneStyle, style, layoutStyle?.flex != null ? { width: '100%', flexGrow: 1 } : null]}>
      {children}
    </Surface>
  );
  if (!onPress) {
    return (
      <View testID={testID} style={layoutStyle}>
        {content}
      </View>
    );
  }
  // Sem role "button": o cartão pode conter botões próprios (evita <button> aninhado na web).
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [layoutStyle, pressed && { opacity: 0.85, transform: [{ scale: 0.995 }] }]}
    >
      {content}
    </Pressable>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  onPress,
  testID,
}: {
  label: string;
  value: string | number;
  icon?: IconName;
  hint?: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Card style={styles.statCard} onPress={onPress} testID={testID}>
      <View style={styles.statInner}>
        {icon ? (
          <View style={styles.statIcon}>
            <Icon name={icon} size={20} color={colors.goldDark} />
          </View>
        ) : null}
        <View style={styles.statValueRow}>
          <Text variant="headlineMedium" style={styles.statValue} numberOfLines={1}>
            {value}
          </Text>
          {onPress ? <Icon name="chevron-right" size={22} color={colors.tabInactive} /> : null}
        </View>
        <Text variant="labelMedium" style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
        {hint ? (
          <Text variant="bodySmall" style={styles.subtitle} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

export function ListRow({
  title,
  subtitle,
  kicker,
  meta,
  icon,
  left,
  right,
  onPress,
  testID,
  chevron = true,
  last,
}: {
  title: string;
  subtitle?: string | null;
  kicker?: string | null;
  meta?: string | null;
  icon?: IconName;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  testID?: string;
  chevron?: boolean;
  last?: boolean;
}) {
  const body = (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      {left ? (
        left
      ) : icon ? (
        <View style={styles.rowIcon}>
          <Icon name={icon} size={20} color={colors.ink} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        {kicker ? (
          <Text variant="labelSmall" style={styles.rowKicker} numberOfLines={1}>
            {kicker}
          </Text>
        ) : null}
        <Text variant="titleSmall" style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" style={styles.rowSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta ? (
        <Text variant="labelMedium" style={styles.rowMeta}>
          {meta}
        </Text>
      ) : null}
      {right}
      {onPress && chevron ? <Icon name="chevron-right" size={20} color={colors.tabInactive} /> : null}
    </View>
  );
  if (!onPress) return <View testID={testID}>{body}</View>;
  // Sem accessibilityRole="button": a linha pode conter botões (evita <button> aninhado na web).
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [pressed && { backgroundColor: colors.paper }]}
    >
      {body}
    </Pressable>
  );
}

export function ListCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Card style={[{ paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' }, style]}>{children}</Card>;
}

export function Tag({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold';
  icon?: IconName;
}) {
  const palette: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: colors.paper, fg: colors.muted },
    success: { bg: '#E3F3EA', fg: colors.success },
    warning: { bg: '#FBEFD6', fg: colors.warning },
    danger: { bg: '#FDE7E4', fg: colors.danger },
    info: { bg: '#DDE6F2', fg: colors.midnight },
    gold: { bg: '#F8E7BF', fg: colors.goldDark },
  };
  const { bg, fg } = palette[tone];
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      {icon ? <Icon name={icon} size={13} color={fg} /> : null}
      <Text variant="labelSmall" style={{ color: fg, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.md }} contentContainerStyle={[styles.chips, { paddingHorizontal: spacing.md }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Chip
            key={option.value}
            selected={selected}
            onPress={() => onChange(option.value)}
            icon={option.icon}
            mode={selected ? 'flat' : 'outlined'}
            style={[styles.chip, selected && { backgroundColor: colors.ink }]}
            textStyle={{ color: selected ? colors.white : colors.ink }}
            theme={{ colors: { onSurfaceVariant: selected ? colors.white : colors.ink } }}
            showSelectedCheck={false}
            testID={`chip-${option.value}`}
          >
            {option.label}
          </Chip>
        );
      })}
    </ScrollView>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}) {
  return (
    <View testID={testID}>
      <SegmentedButtons
        value={value}
        onValueChange={(next) => onChange(next as T)}
        buttons={options.map((option) => ({ value: option.value, label: option.label, icon: option.icon }))}
        style={{ marginBottom: spacing.md }}
        theme={{ colors: { secondaryContainer: colors.ink, onSecondaryContainer: colors.white } }}
      />
    </View>
  );
}

export function BrandButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  testID,
  icon,
  loading,
  style,
  compact,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'gold' | 'ghost' | 'text' | 'danger' | 'tonal';
  testID?: string;
  icon?: IconName;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const mode =
    variant === 'ghost' ? 'outlined' : variant === 'text' ? 'text' : variant === 'tonal' ? 'contained-tonal' : 'contained';
  const buttonColor =
    variant === 'primary' ? colors.ink : variant === 'gold' ? colors.gold : variant === 'danger' ? colors.danger : undefined;
  const textColor =
    variant === 'primary' || variant === 'danger'
      ? colors.white
      : variant === 'gold'
        ? colors.ink
        : variant === 'tonal'
          ? colors.ink
          : colors.ink;
  return (
    <Button
      testID={testID}
      mode={mode}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      icon={icon}
      compact={compact}
      buttonColor={buttonColor}
      textColor={textColor}
      style={[styles.button, variant === 'ghost' && { borderColor: colors.line }, style]}
      contentStyle={styles.buttonContent}
      labelStyle={styles.buttonLabel}
    >
      {label}
    </Button>
  );
}

export function Field({
  label,
  error,
  helper,
  icon,
  style,
  right,
  ...props
}: TextInputProps & { label: string; error?: string | null; helper?: string; icon?: IconName; right?: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <TextInput
        mode="outlined"
        label={label}
        autoCapitalize="none"
        outlineColor={colors.line}
        activeOutlineColor={colors.ink}
        textColor={colors.ink}
        style={[styles.input, style as StyleProp<ViewStyle>]}
        outlineStyle={{ borderRadius: radius.md }}
        left={icon ? <TextInput.Icon icon={icon} color={colors.muted} /> : undefined}
        right={right}
        error={Boolean(error)}
        {...(props as any)}
      />
      {error ? (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      ) : helper ? (
        <HelperText type="info" visible>
          {helper}
        </HelperText>
      ) : null}
    </View>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Pesquisar',
  onSubmit,
  testID,
  autoFocus,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  testID?: string;
  autoFocus?: boolean;
}) {
  return (
    <Searchbar
      testID={testID}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      onSubmitEditing={onSubmit}
      autoFocus={autoFocus}
      mode="bar"
      style={styles.search}
      inputStyle={{ color: colors.ink }}
      iconColor={colors.muted}
      placeholderTextColor={colors.muted}
    />
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Icon name="alert-circle-outline" size={18} color={colors.danger} />
      <Text variant="bodyMedium" style={styles.error}>
        {message}
      </Text>
    </View>
  );
}

export function LoadingState({ label = 'A carregar…' }: { label?: string }) {
  return (
    <View style={styles.loading} testID="loading-state">
      <ActivityIndicator color={colors.gold} />
      <Text variant="bodyMedium" style={styles.subtitle}>
        {label}
      </Text>
    </View>
  );
}

export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.skeleton, { height, width }, style]} />;
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <View testID="loading-state">
      {Array.from({ length: rows }).map((_, index) => (
        <Card key={index}>
          <Skeleton width="55%" height={18} />
          <Skeleton width="85%" height={12} style={{ marginTop: spacing.sm }} />
        </Card>
      ))}
    </View>
  );
}

export function EmptyState({
  title,
  body,
  icon = 'inbox-outline',
  action,
  onAction,
}: {
  title: string;
  body: string;
  icon?: IconName;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Card style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={26} color={colors.goldDark} />
      </View>
      <Text variant="titleMedium" style={[styles.cardTitle, { textAlign: 'center' }]}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={[styles.subtitle, { textAlign: 'center' }]}>
        {body}
      </Text>
      {action && onAction ? <BrandButton variant="tonal" label={action} onPress={onAction} /> : null}
    </Card>
  );
}

export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
  onConfirm,
  onCancel,
  loading,
}: {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel} style={{ backgroundColor: colors.surface, borderRadius: radius.lg }}>
        <Dialog.Title style={{ color: colors.ink }}>{title}</Dialog.Title>
        {body ? (
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: colors.muted }}>
              {body}
            </Text>
          </Dialog.Content>
        ) : null}
        <Dialog.Actions>
          <Button onPress={onCancel} textColor={colors.muted}>
            {cancelLabel}
          </Button>
          <Button
            onPress={onConfirm}
            loading={loading}
            mode="contained"
            buttonColor={destructive ? colors.danger : colors.ink}
            textColor={colors.white}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

export function PrimaryFab({
  icon = 'plus',
  label,
  onPress,
  testID,
}: {
  icon?: IconName;
  label?: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <FAB
      testID={testID}
      icon={icon}
      label={label}
      onPress={onPress}
      color={colors.ink}
      style={styles.fab}
      theme={{ colors: { primaryContainer: colors.gold } }}
    />
  );
}

export function IconAction({
  icon,
  label,
  onPress,
  testID,
  tone = 'tonal',
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID?: string;
  tone?: 'tonal' | 'ink' | 'gold';
}) {
  const bg = tone === 'ink' ? colors.ink : tone === 'gold' ? colors.gold : '#F8E7BF';
  const fg = tone === 'ink' ? colors.white : colors.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        opacity: pressed ? 0.8 : 1,
        marginTop: spacing.sm,
      })}
    >
      <Icon name={icon} size={22} color={fg} />
    </Pressable>
  );
}

export function Row({ children, style, gap = spacing.sm }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.line, marginVertical: spacing.sm }} />;
}

export function KeyValue({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.keyValue}>
      <Text variant="labelMedium" style={{ color: colors.muted }}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ color: colors.ink, flex: 1, textAlign: 'right' }}>
        {String(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  screenContent: { paddingBottom: 96 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  eyebrow: { color: colors.goldDark, fontWeight: '700', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  title: { color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { color: colors.ink, flex: 1 },
  sectionAction: { fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.sm,
  },
  cardTitle: { color: colors.ink, marginBottom: 4 },
  statCard: { flex: 1, minWidth: 0 },
  statInner: { gap: 8, minHeight: 108, justifyContent: 'space-between' },
  statIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8E7BF', alignItems: 'center', justifyContent: 'center' },
  statValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs, minWidth: 0 },
  statLabel: { color: colors.muted },
  statValue: { color: colors.ink, flexShrink: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  rowKicker: { color: colors.goldDark, marginBottom: 2 },
  rowTitle: { color: colors.ink },
  rowSubtitle: { color: colors.muted, marginTop: 2 },
  rowMeta: { color: colors.muted },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  chips: { gap: spacing.xs, paddingBottom: spacing.sm },
  chip: { borderColor: colors.line, backgroundColor: colors.surface, flexShrink: 0 },
  button: { borderRadius: radius.md, marginTop: spacing.sm, minWidth: 0, flexShrink: 1 },
  buttonContent: { paddingVertical: 8, paddingHorizontal: 10 },
  buttonLabel: { fontSize: 14, fontWeight: '600', letterSpacing: 0 },
  fabWrap: { position: 'absolute', right: spacing.md, left: spacing.md, alignItems: 'flex-end', pointerEvents: 'box-none' },
  input: { backgroundColor: colors.surface },
  search: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, marginBottom: spacing.md },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: '#FDE7E4', padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.sm },
  error: { color: colors.danger, flex: 1 },
  loading: { alignItems: 'center', padding: spacing.xl, gap: 10 },
  skeleton: { backgroundColor: colors.paper, borderRadius: radius.sm },
  empty: { alignItems: 'center', paddingVertical: spacing.lg },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F8E7BF', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  fab: { borderRadius: radius.lg },
  keyValue: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: 6 },
});
