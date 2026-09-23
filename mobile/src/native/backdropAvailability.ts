import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

/** expo-backdrop expõe o módulo nativo `BlurView` (não confundir com expo-blur). */
export function isNativeBackdropAvailable(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }
  if (Constants.appOwnership === 'expo') {
    return false;
  }
  try {
    return requireOptionalNativeModule('BlurView') != null;
  } catch {
    return false;
  }
}
