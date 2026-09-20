import * as WebBrowser from 'expo-web-browser';
import type { MobileClient } from '../api/client';

export async function openWebDestination(api: MobileClient, path: string) {
  const { url } = await api.createWebBridge(path);
  await WebBrowser.openBrowserAsync(url);
}
