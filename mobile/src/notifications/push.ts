import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { MobileClient } from '../api/client';

export function extractNotificationLink(response: Notifications.NotificationResponse | null | undefined): string | null {
  const data = response?.notification?.request?.content?.data;
  if (!data || typeof data !== 'object') return null;
  const link = (data as { link?: unknown }).link;
  return typeof link === 'string' && link.trim() ? link.trim() : null;
}

/** Escuta taps em push (incluindo o que abriu a app a frio) e devolve o `data.link`. */
export function subscribeToNotificationOpens(onLink: (link: string) => void): () => void {
  let cancelled = false;
  void Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (cancelled) return;
      const link = extractNotificationLink(response);
      if (link) onLink(link);
    })
    .catch(() => undefined);
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const link = extractNotificationLink(response);
    if (link) onLink(link);
  });
  return () => {
    cancelled = true;
    sub.remove();
  };
}

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
