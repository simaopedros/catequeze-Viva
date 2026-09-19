import React from 'react';
import { Image, Text, View } from 'react-native';
import { resolveMediaUrl } from '../api/mediaUrl';
import { colors } from '../theme';

function initialsOf(name?: string | null): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
  return (first + last).toUpperCase();
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
    <View
      testID={testID}
      style={[shape, { backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }]}
    >
      <Text style={{ color: colors.cream, fontWeight: '700', fontSize: size * 0.38 }}>{initialsOf(name)}</Text>
    </View>
  );
}
