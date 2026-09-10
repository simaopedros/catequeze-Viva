import { Platform } from 'react-native';
import { createMemoryStorage, type KeyValueStorage } from './session';

function createLocalStorage(): KeyValueStorage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return {
      getItem: async (key) => localStorage.getItem(key),
      setItem: async (key, value) => {
        localStorage.setItem(key, value);
      },
      removeItem: async (key) => {
        localStorage.removeItem(key);
      },
    };
  } catch {
    return null;
  }
}

export function createFallbackStorage(): KeyValueStorage {
  return createLocalStorage() ?? createMemoryStorage();
}

export async function createSecureStorage(): Promise<KeyValueStorage> {
  if (Platform.OS !== 'web') {
    try {
      const SecureStore = await import('expo-secure-store');
      if (typeof SecureStore.getItemAsync === 'function') {
        return {
          getItem: (key) => SecureStore.getItemAsync(key),
          setItem: (key, value) => SecureStore.setItemAsync(key, value),
          removeItem: (key) => SecureStore.deleteItemAsync(key),
        };
      }
    } catch {
      // Expo Go / native module missing — fall through.
    }
  }
  return createFallbackStorage();
}
