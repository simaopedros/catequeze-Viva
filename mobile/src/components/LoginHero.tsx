import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../theme';
import { BrandLogo } from './BrandLogo';

function Hill({ style }: { style?: object }) {
  return <View style={[styles.hill, style]} />;
}

export function LoginHero() {
  return (
    <LinearGradient colors={['#0F2F4F', '#173B61', '#1E4D7A']} style={styles.hero}>
      <View style={styles.hills}>
        <Hill style={{ left: -40, width: 180, height: 90, opacity: 0.35 }} />
        <Hill style={{ left: 80, width: 220, height: 110, opacity: 0.28 }} />
        <Hill style={{ right: -30, width: 200, height: 100, opacity: 0.32 }} />
      </View>
      <View style={styles.brandRow}>
        <BrandLogo size={64} />
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text style={styles.brandTitle}>Catequese Viva</Text>
          <Text style={styles.brandTag}>Pastoral digital da sua paróquia</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  hills: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  hill: {
    position: 'absolute',
    bottom: -20,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    backgroundColor: '#F1A51E',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandTitle: { ...typography.headingMd, color: colors.white },
  brandTag: { ...typography.bodySm, color: 'rgba(255,255,255,0.82)', marginTop: 4 },
});
