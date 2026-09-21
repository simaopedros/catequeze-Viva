import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, elevation, radius, spacing, typography } from '../theme';
import { Avatar, Card, PrimaryButton } from './ui';

export function IconHubTile({
  label,
  icon: Icon,
  onPress,
  testID,
  active,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  testID?: string;
  active?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.hubTile, active && styles.hubTileActive, pressed && { opacity: 0.9 }]}
    >
      <View style={[styles.hubIconBox, active && styles.hubIconBoxActive]}>
        <Icon size={22} color={active ? colors.white : colors.primary[800]} strokeWidth={2.2} />
      </View>
      <Text style={styles.hubLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

export function HubGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.hubGrid}>{children}</View>;
}

export function AlertStrip({
  items,
}: {
  items: { type?: string; message?: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[4] }}>
      {items.map((alert, index) => (
        <View key={`a-${index}`} style={styles.alertPill}>
          <Text style={styles.alertType}>{alert.type || 'Aviso'}</Text>
          <Text style={styles.alertMsg} numberOfLines={2}>{alert.message}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function StatTile({
  label,
  value,
  icon: Icon,
  onPress,
  disabled,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const inner = (
    <View style={styles.statTile}>
      <View style={styles.statIconWrap}>
        <Icon size={20} color={colors.primary[800]} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
  if (!onPress || disabled) return inner;
  return <Pressable onPress={onPress}>{inner}</Pressable>;
}

export function ConversationRow({
  title,
  preview,
  time,
  unread,
  avatarName,
  onPress,
  testID,
}: {
  title: string;
  preview?: string;
  time?: string;
  unread?: number;
  avatarName?: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.conversationRow, pressed && { opacity: 0.92 }]}>
      <Avatar name={avatarName || title} size={48} />
      <View style={styles.conversationBody}>
        <View style={styles.conversationTop}>
          <Text style={styles.conversationTitle} numberOfLines={1}>{title}</Text>
          {time ? <Text style={styles.conversationTime}>{time}</Text> : null}
        </View>
        <Text style={styles.conversationPreview} numberOfLines={2}>{preview || ' '}</Text>
      </View>
      {unread && unread > 0 ? (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function MessageBubble({
  body,
  author,
  mine,
}: {
  body: string;
  author?: string;
  mine?: boolean;
}) {
  return (
    <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMine]}>
      {!mine && author ? <Text style={styles.bubbleAuthor}>{author}</Text> : null}
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{body}</Text>
      </View>
    </View>
  );
}

export function MessageComposer({
  value,
  onChangeText,
  onSend,
  busy,
  testID,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  busy?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.composer}>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder="Escreva uma mensagem…"
        placeholderTextColor={colors.text.placeholder}
        style={styles.composerInput}
        multiline
      />
      <PrimaryButton
        label={busy ? '…' : 'Enviar'}
        onPress={onSend}
        disabled={busy || !value.trim()}
        fullWidth={false}
        variant="primary"
      />
    </View>
  );
}

export function ClassListCard({
  name,
  community,
  year,
  onPress,
  testID,
}: {
  name: string;
  community?: string;
  year?: string | number;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.94 }}>
      <Card style={styles.classCard} elevated>
        <View style={styles.classAccent} />
        <Text style={styles.className}>{name}</Text>
        <Text style={styles.classMeta}>
          {community || 'Comunidade'}
          {year ? ` · ${year}` : ''}
        </Text>
        <Text style={styles.classCta}>Abrir turma ›</Text>
      </Card>
    </Pressable>
  );
}

export function ClassHero({
  name,
  community,
  stats,
}: {
  name: string;
  community?: string;
  stats?: { label: string; value: string }[];
}) {
  return (
    <LinearGradientHero>
      <Text style={styles.heroClassName}>{name}</Text>
      {community ? <Text style={styles.heroCommunity}>{community}</Text> : null}
      {stats && stats.length > 0 ? (
        <View style={styles.heroStats}>
          {stats.map((s) => (
            <View key={s.label} style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{s.value}</Text>
              <Text style={styles.heroStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </LinearGradientHero>
  );
}

function LinearGradientHero({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={['#173B61', '#23577F']} style={styles.classHero}>
      {children}
    </LinearGradient>
  );
}

export function MenuIconRow({
  title,
  help,
  icon: Icon,
  onPress,
  testID,
}: {
  title: string;
  help?: string;
  icon: LucideIcon;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.92 }]}>
      <View style={styles.menuIconBox}>
        <Icon size={22} color={colors.primary[800]} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuTitle}>{title}</Text>
        {help ? <Text style={styles.menuHelp}>{help}</Text> : null}
      </View>
      <Text style={styles.menuChevron}>›</Text>
    </Pressable>
  );
}

export function ReactionBar({ reactionCount, commentCount }: { reactionCount?: number; commentCount?: number }) {
  const items = ['Amém', 'Rezo', 'Aleluia'];
  return (
    <View style={styles.reactionBar}>
      {items.map((label) => (
        <View key={label} style={styles.reactionChip}>
          <Text style={styles.reactionChipText}>{label}</Text>
        </View>
      ))}
      <Text style={styles.reactionMeta}>
        {(reactionCount ?? 0) > 0 ? `${reactionCount} reações` : ''}
        {(commentCount ?? 0) > 0 ? ` · ${commentCount} comentários` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  hubTile: {
    width: '31%',
    minWidth: 100,
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  hubTileActive: {},
  hubIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  hubIconBoxActive: {
    backgroundColor: colors.primary[800],
    borderColor: colors.primary[800],
  },
  hubLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  alertPill: {
    width: 260,
    marginRight: spacing[3],
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: '#F0D9A8',
  },
  alertType: { ...typography.labelSm, color: colors.warning, marginBottom: 4 },
  alertMsg: { ...typography.bodySm, color: colors.text.primary },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[3],
    minHeight: 108,
    ...elevation.card,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.text.primary },
  statLabel: { ...typography.bodySm, color: colors.text.muted, marginTop: 2 },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing[3],
  },
  conversationBody: { flex: 1 },
  conversationTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  conversationTitle: { ...typography.headingSm, color: colors.text.primary, flex: 1 },
  conversationTime: { ...typography.caption, color: colors.text.muted },
  conversationPreview: { ...typography.bodySm, color: colors.text.muted, marginTop: 4 },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { fontSize: 11, fontWeight: '700', color: colors.text.primary },
  bubbleWrap: { marginBottom: spacing[3], alignItems: 'flex-start', maxWidth: '88%' },
  bubbleWrapMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleAuthor: { ...typography.caption, color: colors.text.muted, marginBottom: 4, marginLeft: 4 },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  bubbleMine: { backgroundColor: colors.primary[800], borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { ...typography.bodyMd, color: colors.primary[700] },
  bubbleTextMine: { color: colors.white },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: 10,
    color: colors.text.primary,
    fontSize: 15,
  },
  classCard: { overflow: 'hidden', paddingLeft: spacing[4] + 6 },
  classAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: colors.accent[500],
  },
  className: { ...typography.headingSm, color: colors.text.primary },
  classMeta: { ...typography.bodySm, color: colors.text.muted, marginTop: 4 },
  classCta: { ...typography.labelSm, color: colors.primary[700], marginTop: spacing[3] },
  classHero: {
    borderRadius: radius.xl,
    padding: spacing[5],
    marginBottom: spacing[5],
  },
  heroClassName: { fontSize: 24, fontWeight: '700', color: colors.white },
  heroCommunity: { ...typography.bodyMd, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  heroStats: { flexDirection: 'row', marginTop: spacing[5], gap: spacing[6] },
  heroStatItem: {},
  heroStatValue: { fontSize: 20, fontWeight: '700', color: colors.white },
  heroStatLabel: { ...typography.caption, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    gap: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: { ...typography.headingSm, color: colors.text.primary },
  menuHelp: { ...typography.bodySm, color: colors.text.muted, marginTop: 2 },
  menuChevron: { fontSize: 22, color: colors.text.placeholder },
  reactionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reactionChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionChipText: { ...typography.labelSm, color: colors.primary[800] },
  reactionMeta: { ...typography.caption, color: colors.text.muted, flex: 1, textAlign: 'right' },
});
