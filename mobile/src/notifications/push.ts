import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { MobileClient } from '../api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Pede permissão, obtém o Expo push token e regista-o no backend. */
export async function registerForPushNotifications(api: MobileClient): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Geral',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  await api.registerPushToken(token.data, Platform.OS);
  return token.data;
}

export async function unregisterFromPushNotifications(api: MobileClient, token: string | null): Promise<void> {
  if (!token) return;
  await api.unregisterPushToken(token).catch(() => undefined);
}
