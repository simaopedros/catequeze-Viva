import { BlurView as ExpoBlurView } from 'expo-blur';
import React, { useMemo } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isNativeBackdropAvailable } from '../native/backdropAvailability';
import { colors, radius, spacing } from '../theme';

type BackdropBlurComponent = React.ComponentType<{
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: string;
}>;

function loadNativeBackdropBlur(): BackdropBlurComponent | null {
  if (!isNativeBackdropAvailable()) {
    return null;
  }
  try {
    const mod = require('expo-backdrop') as { BlurView: BackdropBlurComponent };
    return mod.BlurView ?? null;
  } catch {
    return null;
  }
}

const NativeBackdropBlur = loadNativeBackdropBlur();

const OVERLAY_RGBA = 'rgba(7, 29, 54, 0.45)';

function SheetOverlay({ onPress }: { onPress: () => void }) {
  if (NativeBackdropBlur) {
    return (
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} accessibilityLabel="Fechar">
        <NativeBackdropBlur
          style={StyleSheet.absoluteFill}
          intensity={55}
          tint="systemThinMaterialDark"
        />
        <View style={styles.overlayDim} pointerEvents="none" />
      </Pressable>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <Pressable style={styles.overlayFallback} onPress={onPress} accessibilityLabel="Fechar" />
    );
  }

  return (
    <Pressable style={styles.overlayFallback} onPress={onPress} accessibilityLabel="Fechar">
      <ExpoBlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.overlayDimLight} pointerEvents="none" />
    </Pressable>
  );
}

export function PastoralBottomSheet({
  visible,
  onClose,
  children,
  testID,
  sheetStyle,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  testID?: string;
  sheetStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const panelStyle = useMemo(
    () => [
      styles.sheet,
      { paddingBottom: Math.max(spacing[6], insets.bottom + spacing[3]) },
      sheetStyle,
    ],
    [insets.bottom, sheetStyle],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <SheetOverlay onPress={onClose} />
        <View style={panelStyle} testID={testID}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: OVERLAY_RGBA,
  },
  overlayDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 29, 54, 0.25)',
  },
  overlayDimLight: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 29, 54, 0.2)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    gap: spacing[2],
  },
});
