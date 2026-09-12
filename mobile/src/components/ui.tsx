import React from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import {
  attendanceTone,
  colors,
  fonts,
  hitSlop,
  radii,
  spacing,
  type,
  type AttendanceStatusId,
} from '../theme';

export function Screen({
  children,
  padded = true,
  testID,
  footer,
  ink = false,
}: {
  children: React.ReactNode;
  padded?: boolean;
  testID?: string;
  footer?: React.ReactNode;
  ink?: boolean;
}) {
  const background = ink ? colors.ink : colors.paper;
  const content = (
    <ScrollView
      testID={footer ? undefined : testID}
      style={{ flex: 1, backgroundColor: background }}
      contentContainerStyle={[styles.screenContent, padded && { padding: spacing.lg }]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
  if (!footer) return content;
  return (
    <View testID={testID} style={[styles.flex, { backgroundColor: background }]}>
      {content}
      <View style={styles.footer}>{footer}</View>
    </View>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text allowFontScaling style={styles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text allowFontScaling style={styles.subtitle}>
          {subtitle}
        </Text>
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
  variant?: 'primary' | 'ghost' | 'danger';
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={[
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text
        allowFontScaling
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
      <Text allowFontScaling style={styles.fieldLabel}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCapitalize="none"
        allowFontScaling
        {...props}
      />
    </View>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Text allowFontScaling style={styles.error}>
      {message}
    </Text>
  );
}

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <View style={styles.loading} testID="loading-state">
      <ActivityIndicator color={colors.gold} />
      <Text allowFontScaling style={styles.subtitle}>
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  testID,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}) {
  return (
    <View style={styles.empty} testID={testID}>
      <Text allowFontScaling style={styles.emptyTitle}>
        {title}
      </Text>
      <Text allowFontScaling style={styles.subtitle}>
        {body}
      </Text>
      {actionLabel && onAction ? (
        <BrandButton label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}

export function initialsOf(name?: string | null) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '•';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function Avatar({
  name,
  uri,
  size = 44,
}: {
  name?: string | null;
  uri?: string | null;
  size?: number;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.canvas }}
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
      <Text style={{ color: colors.cream, fontFamily: fonts.sansSemi, fontSize: size * 0.36 }}>
        {initialsOf(name)}
      </Text>
    </View>
  );
}

export function PersonRow({
  name,
  hint,
  chip,
  photoUrl,
  onPress,
  testID,
  trailing,
}: {
  name: string;
  hint?: string;
  chip?: string;
  photoUrl?: string | null;
  onPress?: () => void;
  testID?: string;
  trailing?: React.ReactNode;
}) {
  const inner = (
    <View style={styles.personRow}>
      <Avatar name={name} uri={photoUrl} />
      <View style={{ flex: 1, paddingHorizontal: spacing.sm }}>
        <Text allowFontScaling style={styles.personName}>
          {name}
        </Text>
        {hint ? (
          <Text allowFontScaling style={styles.caption} numberOfLines={2}>
            {hint}
          </Text>
        ) : null}
        {chip ? (
          <Text allowFontScaling style={styles.chipText}>
            {chip}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable accessibilityRole="button" testID={testID} onPress={onPress} style={styles.personPress}>
      {inner}
    </Pressable>
  );
}

function StatusShape({ shape, color, selected }: { shape: 'circle' | 'square' | 'diamond' | 'pill'; color: string; selected?: boolean }) {
  const fill = selected ? color : colors.white;
  const border = color;
  if (shape === 'diamond') {
    return (
      <View
        style={{
          width: 12,
          height: 12,
          backgroundColor: fill,
          borderWidth: 2,
          borderColor: border,
          transform: [{ rotate: '45deg' }],
        }}
      />
    );
  }
  if (shape === 'square') {
    return (
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 2,
          backgroundColor: fill,
          borderWidth: 2,
          borderColor: border,
        }}
      />
    );
  }
  if (shape === 'pill') {
    return (
      <View
        style={{
          width: 16,
          height: 8,
          borderRadius: 8,
          backgroundColor: fill,
          borderWidth: 2,
          borderColor: border,
        }}
      />
    );
  }
  return (
    <View
      style={{
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: fill,
        borderWidth: 2,
        borderColor: border,
      }}
    />
  );
}

export function StatusPill({
  status,
  selected,
  onPress,
  label,
}: {
  status: AttendanceStatusId;
  selected?: boolean;
  onPress: () => void;
  label?: string;
}) {
  const tone = attendanceTone[status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tone.label}
      hitSlop={hitSlop}
      onPress={onPress}
      style={[
        styles.statusPill,
        selected && { backgroundColor: tone.color, borderColor: tone.color },
      ]}
    >
      <StatusShape shape={tone.shape} color={tone.color} selected={selected} />
      <Text
        allowFontScaling
        style={[styles.statusPillLabel, selected && { color: colors.white }]}
      >
        {label || tone.label}
      </Text>
    </Pressable>
  );
}

export function HeroHeader({
  kicker,
  title,
  subtitle,
  actionLabel,
  onAction,
  testID,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onAction}
      disabled={!onAction}
      style={styles.hero}
    >
      <View style={[styles.heroPattern, { pointerEvents: 'none' }]}>
        <View style={styles.heroArc} />
        <View style={[styles.heroArc, { top: 28, left: 40, opacity: 0.35 }]} />
      </View>
      {kicker ? (
        <Text allowFontScaling style={styles.heroKicker}>
          {kicker}
        </Text>
      ) : null}
      <Text allowFontScaling style={styles.heroTitle}>
        {title}
      </Text>
      {subtitle ? (
        <Text allowFontScaling style={styles.heroSubtitle}>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel ? (
        <Text allowFontScaling style={styles.heroAction}>
          {actionLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function ChatBubble({
  body,
  mine,
  author,
  time,
}: {
  body: string;
  mine?: boolean;
  author?: string;
  time?: string;
}) {
  return (
    <View style={[styles.bubbleWrap, mine ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
      {!mine && author ? (
        <Text allowFontScaling style={styles.caption}>
          {author}
        </Text>
      ) : null}
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text allowFontScaling style={[styles.bubbleText, mine && { color: colors.cream }]}>
          {body}
        </Text>
      </View>
      {time ? (
        <Text allowFontScaling style={styles.caption}>
          {time}
        </Text>
      ) : null}
    </View>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
  testID,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  testID?: string;
}) {
  return (
    <View testID={testID} style={styles.segment}>
      {options.map((option) => (
          <Pressable
            key={option.id}
            testID={`${testID || 'segment'}-${option.id}`}
            onPress={() => onChange(option.id)}
            style={[styles.segmentItem, option.id === value && styles.segmentActive]}
          >
            <Text
              allowFontScaling
              style={[styles.segmentLabel, option.id === value && { color: colors.white }]}
            >
              {option.label}
            </Text>
          </Pressable>
      ))}
    </View>
  );
}

export function ShortcutRow({
  items,
}: {
  items: { id: string; label: string; hint?: string; onPress: () => void }[];
}) {
  return (
    <View style={styles.shortcuts}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          testID={`shortcut-${item.id}`}
          onPress={item.onPress}
          style={styles.shortcut}
        >
          <Text allowFontScaling style={styles.shortcutLabel}>
            {item.label}
          </Text>
          {item.hint ? (
            <Text allowFontScaling style={styles.caption} numberOfLines={2}>
              {item.hint}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

export function IconTile({
  label,
  hint,
  onPress,
  testID,
  icon,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  testID?: string;
  icon?: string;
}) {
  return (
    <Pressable accessibilityRole="button" testID={testID} onPress={onPress} style={styles.tile}>
      <View style={styles.tileIcon}>
        <Text style={styles.tileGlyph}>{icon || label.slice(0, 1)}</Text>
      </View>
      <Text allowFontScaling style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
      {hint ? (
        <Text allowFontScaling style={styles.caption} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder = 'Pesquisar',
  testID,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  testID?: string;
}) {
  return (
    <TextInput
      testID={testID}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      allowFontScaling
      style={styles.search}
    />
  );
}

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  busy,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  busy?: boolean;
}) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.composer}>
        <TextInput
          testID="message-input"
          value={value}
          onChangeText={onChangeText}
          placeholder="Mensagem"
          placeholderTextColor={colors.muted}
          allowFontScaling
          style={styles.composerInput}
        />
        <Pressable
          accessibilityRole="button"
          disabled={busy || !value.trim()}
          onPress={onSend}
          style={[styles.send, (!value.trim() || busy) && { opacity: 0.4 }]}
        >
          <Text style={styles.sendLabel}>{busy ? '…' : 'Enviar'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
          <Text allowFontScaling style={styles.compactLabel}>
            {label}
          </Text>
          {hint ? (
            <Text allowFontScaling style={styles.compactHint}>
              {hint}
            </Text>
          ) : null}
          {badge ? (
            <Text allowFontScaling style={styles.compactBadge}>
              {badge}
            </Text>
          ) : null}
        </View>
        <Text style={styles.compactChevron}>›</Text>
      </Pressable>
    );
  }

  return (
    <Pressable accessibilityRole="button" testID={testID} onPress={onPress}>
      <PersonRow name={label} hint={hint} chip={badge} />
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
    tone === 'success'
      ? colors.success
      : tone === 'danger'
        ? colors.danger
        : tone === 'gold'
          ? colors.goldDark
          : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: selectedColor, borderColor: selectedColor }]}
    >
      <Text allowFontScaling style={[styles.chipLabel, selected && { color: colors.white }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenContent: { paddingBottom: 48 },
  footer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
  title: { ...type.title },
  subtitle: { ...type.body, color: colors.muted, marginTop: 6, fontSize: 15 },
  caption: { ...type.caption, marginTop: 2 },
  card: {
    backgroundColor: colors.paper,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md,
  },
  button: {
    borderRadius: radii.sm,
    minHeight: 44,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonPrimary: { backgroundColor: colors.gold },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { color: colors.ink, fontFamily: fonts.sansBold, fontSize: 16 },
  fieldLabel: { color: colors.ink, fontFamily: fonts.sansSemi, marginBottom: 6 },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    minHeight: 48,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 18,
    fontFamily: fonts.sans,
  },
  error: { color: colors.danger, marginBottom: spacing.sm, fontFamily: fonts.sansMedium },
  loading: { alignItems: 'center', padding: spacing.xl, gap: 10 },
  empty: { paddingVertical: spacing.lg },
  emptyTitle: { ...type.titleSmall, marginBottom: 4 },
  compactRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  compactRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  compactLabel: { color: colors.ink, fontSize: 16, fontFamily: fonts.sansSemi },
  compactHint: { color: colors.muted, fontSize: 13, marginTop: 2, fontFamily: fonts.sans },
  compactBadge: { color: colors.goldDark, fontSize: 12, marginTop: 4, fontFamily: fonts.sansMedium },
  compactChevron: { color: colors.muted, fontSize: 22, fontWeight: '300' },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  chipLabel: { color: colors.inkSoft, fontFamily: fonts.sansSemi, fontSize: 13 },
  personPress: { marginBottom: spacing.sm },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  personName: { ...type.bodyStrong },
  chipText: { color: colors.goldDark, fontFamily: fonts.sansMedium, fontSize: 12, marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  statusPillLabel: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.ink },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    minHeight: 148,
  },
  heroPattern: { ...StyleSheet.absoluteFill },
  heroArc: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 18,
    borderColor: colors.gold,
    opacity: 0.18,
    top: -40,
    right: -30,
  },
  heroKicker: { color: colors.gold, fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 0.6 },
  heroTitle: { fontFamily: fonts.serifBold, fontSize: 26, lineHeight: 32, color: colors.cream, marginTop: 8 },
  heroSubtitle: { color: '#c9d6e4', fontFamily: fonts.sans, fontSize: 15, marginTop: 8, lineHeight: 22 },
  heroAction: { color: colors.gold, fontFamily: fonts.sansBold, marginTop: 14, fontSize: 15 },
  bubbleWrap: { marginBottom: spacing.sm, maxWidth: '86%' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: colors.bubbleMine, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.bubbleTheirs, borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 22, color: colors.ink },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.canvas,
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: spacing.md,
  },
  segmentItem: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  segmentActive: { backgroundColor: colors.ink },
  segmentLabel: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.ink },
  shortcuts: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  shortcut: {
    flex: 1,
    minHeight: 72,
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: spacing.sm,
    justifyContent: 'center',
  },
  shortcutLabel: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
  tile: {
    width: '31%',
    minHeight: 96,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.canvas,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileGlyph: { color: colors.cream, fontFamily: fonts.serif, fontSize: 16 },
  tileLabel: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.ink },
  search: {
    backgroundColor: colors.canvas,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    minHeight: 44,
    marginBottom: spacing.md,
    fontFamily: fonts.sans,
    color: colors.ink,
    fontSize: 16,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radii.pill,
    backgroundColor: colors.canvas,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
  },
  send: {
    minHeight: 44,
    minWidth: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  sendLabel: { color: colors.cream, fontFamily: fonts.sansBold },
});
