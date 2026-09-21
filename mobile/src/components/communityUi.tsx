import { Image, Link2, PenLine, Video } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';
import { Avatar } from './ui';

export type CommunityFeedScope = 'all' | 'parish' | 'classes';

export function CommunityScreenHeader({ onLinkPress }: { onLinkPress?: () => void }) {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.pageTitle}>Comunidade</Text>
      <Pressable onPress={onLinkPress} hitSlop={12} testID="community-link-action">
        <Link2 size={22} color={colors.primary[800]} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

export function CommunityScopeFilters({
  value,
  onChange,
}: {
  value: CommunityFeedScope;
  onChange: (scope: CommunityFeedScope) => void;
}) {
  const items: { id: CommunityFeedScope; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'parish', label: 'Paróquia' },
    { id: 'classes', label: 'Turmas' },
  ];
  return (
    <View style={styles.scopeRow} testID="community-scope-filters">
      {items.map((item) => {
        const active = value === item.id;
        return (
          <Pressable
            key={item.id}
            testID={`scope-${item.id}`}
            onPress={() => onChange(item.id)}
            style={[styles.scopeChip, active && styles.scopeChipActive]}
          >
            <Text style={[styles.scopeLabel, active && styles.scopeLabelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CommunityComposeCard({
  userName,
  avatarUrl,
  onCompose,
  onComposeText,
  onComposeImage,
  onComposeVideo,
  disabled,
}: {
  userName?: string;
  avatarUrl?: string | null;
  onCompose: () => void;
  onComposeText?: () => void;
  onComposeImage?: () => void;
  onComposeVideo?: () => void;
  disabled?: boolean;
}) {
  const openText = onComposeText ?? onCompose;
  const openImage = onComposeImage ?? onCompose;
  const openVideo = onComposeVideo ?? onCompose;

  return (
    <View style={styles.composeCard} testID="community-compose-card">
      <Pressable onPress={onCompose} disabled={disabled} style={styles.composeTop}>
        <Avatar name={userName || 'Eu'} size={40} />
        <Text style={styles.composePlaceholder}>O que você gostaria de compartilhar?</Text>
      </Pressable>
      <View style={styles.composeActions}>
        <ComposeAction testID="compose-action-text" icon={PenLine} label="Texto" onPress={openText} disabled={disabled} />
        <ComposeAction testID="compose-action-image" icon={Image} label="Imagem" onPress={openImage} disabled={disabled} />
        <ComposeAction testID="compose-action-video" icon={Video} label="Vídeo" onPress={openVideo} disabled={disabled} />
      </View>
    </View>
  );
}

function ComposeAction({
  icon: Icon,
  label,
  onPress,
  disabled,
  testID,
}: {
  icon: typeof PenLine;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} disabled={disabled} style={styles.composeAction}>
      <Icon size={18} color={colors.primary[800]} />
      <Text style={styles.composeActionLabel}>{label}</Text>
    </Pressable>
  );
}

export function formatPostTimeAgo(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dias`;
}

export function postScopeMeta(post: { parish?: { name?: string } | null }) {
  if (post.parish?.name) return post.parish.name;
  return 'Turma';
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary[800],
  },
  scopeRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  scopeChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.border,
  },
  scopeChipActive: {
    backgroundColor: colors.primary[800],
    borderColor: colors.primary[800],
  },
  scopeLabel: {
    ...typography.labelLg,
    color: colors.primary[800],
  },
  scopeLabelActive: {
    color: colors.white,
  },
  composeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  composeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  composePlaceholder: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.text.placeholder,
  },
  composeActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing[3],
  },
  composeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    minHeight: 40,
    paddingHorizontal: spacing[2],
  },
  composeActionLabel: {
    ...typography.labelLg,
    color: colors.primary[800],
  },
});
