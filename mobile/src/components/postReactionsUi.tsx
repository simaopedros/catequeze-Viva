import { HandHeart, HeartHandshake, Sparkles } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export type PastoralReactionId = 'AMEM' | 'REZO' | 'ALELUIA';

export const PASTORAL_REACTIONS: {
  id: PastoralReactionId;
  label: string;
  Icon: LucideIcon;
}[] = [
  { id: 'AMEM', label: 'Amém', Icon: HandHeart },
  { id: 'REZO', label: 'Rezo', Icon: HeartHandshake },
  { id: 'ALELUIA', label: 'Aleluia', Icon: Sparkles },
];

export function PostReactionStrip({
  active,
  totalCount,
  disabled,
  onReact,
}: {
  active?: PastoralReactionId | null;
  totalCount?: number;
  disabled?: boolean;
  onReact: (type: PastoralReactionId) => void;
}) {
  return (
    <View style={styles.wrap} testID="post-reaction-strip">
      <View style={styles.row}>
        {PASTORAL_REACTIONS.map(({ id, label, Icon }) => {
          const selected = active === id;
          return (
            <Pressable
              key={id}
              testID={`react-${id}`}
              disabled={disabled}
              onPress={() => onReact(id)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipActive,
                pressed && !disabled && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Icon
                size={18}
                color={selected ? colors.white : colors.primary[700]}
                strokeWidth={2.2}
              />
              <Text style={[styles.chipLabel, selected && styles.chipLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {(totalCount ?? 0) > 0 ? (
        <Text style={styles.meta}>
          {totalCount} {(totalCount ?? 0) === 1 ? 'reação' : 'reações'}
        </Text>
      ) : (
        <Text style={styles.meta}>Reações pastorais — escolha uma</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing[2],
    marginBottom: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary[800],
    borderColor: colors.primary[800],
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[800],
  },
  chipLabelActive: {
    color: colors.white,
  },
  meta: {
    marginTop: spacing[2],
    fontSize: 13,
    color: colors.text.muted,
  },
});
