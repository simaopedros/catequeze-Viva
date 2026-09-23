import React from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isNativeBackdropAvailable } from '../native/backdropAvailability';
import { colors } from '../theme';

type ProgressiveBlurComponent = React.ComponentType<{
  edge?: 'top' | 'bottom' | 'left' | 'right';
  style?: ViewStyle;
  intensity?: number;
  scrollFallback?: boolean;
  fallbackColor?: string;
}>;

function loadProgressiveBlur(): ProgressiveBlurComponent | null {
  if (!isNativeBackdropAvailable()) {
    return null;
  }
  try {
    const mod = require('expo-backdrop') as { ProgressiveBlurView: ProgressiveBlurComponent };
    return mod.ProgressiveBlurView ?? null;
  } catch {
    return null;
  }
}

const ProgressiveBlurView = loadProgressiveBlur();

/** Borda de scroll com blur nativo em dev build; invisível no Expo Go / web. */
export function ScrollEdgeBlur({
  edge = 'top',
  extraHeight = 56,
}: {
  edge?: 'top' | 'bottom';
  extraHeight?: number;
}) {
  const insets = useSafeAreaInsets();

  if (!ProgressiveBlurView || Platform.OS === 'web') {
    return null;
  }

  const height = edge === 'top' ? insets.top + extraHeight : insets.bottom + extraHeight;
  const positionStyle =
    edge === 'top'
      ? { top: 0, left: 0, right: 0, height }
      : { bottom: 0, left: 0, right: 0, height };

  return (
    <View style={[styles.wrap, positionStyle]} pointerEvents="none">
      <ProgressiveBlurView
        edge={edge}
        intensity={48}
        scrollFallback
        fallbackColor={colors.canvas}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 2,
  },
});
