import { createMemoryStorage, type KeyValueStorage } from './session';

export async function createSecureStorage(): Promise<KeyValueStorage> {
  try {
    const SecureStore = await import('expo-secure-store');
    return {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    };
  } catch {
    return createMemoryStorage();
  }
}
