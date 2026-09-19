import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { resolveMediaUrl } from '../api/mediaUrl';
import { colors, fontFamilies } from '../theme';

const PALETTE = ['#153A63', '#8A6418', '#1f7a4d', '#6B3FA0', '#B7472A', '#0E7490'];

function initialsOf(name?: string | null): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
  return (first + last).toUpperCase();
}

function colorFor(name?: string | null): string {
  if (!name) return colors.ink;
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function Avatar({
  name,
  url,
  size = 40,
  testID,
}: {
  name?: string | null;
  url?: string | null;
  size?: number;
  testID?: string;
}) {
  const uri = resolveMediaUrl(url);
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image testID={testID} source={{ uri }} style={shape} accessibilityLabel={name || 'Avatar'} />;
  }
  return (
    <View testID={testID} style={[shape, styles.fallback, { backgroundColor: colorFor(name) }]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

export function AvatarStack({
  people,
  size = 28,
  max = 4,
}: {
  people: { name?: string | null; url?: string | null }[];
  size?: number;
  max?: number;
}) {
  const visible = people.slice(0, max);
  const rest = people.length - visible.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {visible.map((person, index) => (
        <View key={`${person.name}-${index}`} style={{ marginLeft: index === 0 ? 0 : -size * 0.3, borderWidth: 2, borderColor: colors.surface, borderRadius: size }}>
          <Avatar name={person.name} url={person.url} size={size} />
        </View>
      ))}
      {rest > 0 ? (
        <Text style={{ marginLeft: 6, color: colors.muted, fontFamily: fontFamilies.medium, fontSize: 12 }}>+{rest}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.cream, fontFamily: fontFamilies.bold, fontWeight: '700' },
});
