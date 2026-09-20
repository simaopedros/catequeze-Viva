import * as Haptics from 'expo-haptics';

function canHaptic() {
  return typeof Haptics.selectionAsync === 'function';
}

export async function hapticSelection() {
  try {
    if (canHaptic()) await Haptics.selectionAsync();
  } catch {
    /* web / tests */
  }
}

export async function hapticSuccess() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* web / tests */
  }
}

export async function hapticWarning() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    /* web / tests */
  }
}
