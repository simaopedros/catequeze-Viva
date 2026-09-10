import { Platform } from 'react-native';
import { createFallbackStorage, createSecureStorage } from '../auth/secureStorage';
import { createMemoryStorage, createSessionStore, SESSION_KEY, WORKSPACE_KEY } from '../auth/session';

describe('session store', () => {
  it('persists and clears the bearer session', async () => {
    const store = createSessionStore(createMemoryStorage());
    expect(await store.getSessionId()).toBeNull();
    await store.setSessionId('abc');
    expect(await store.getSessionId()).toBe('abc');
    await store.clearSession();
    expect(await store.getSessionId()).toBeNull();
  });

  it('keeps the last workspace separately from the session', async () => {
    const storage = createMemoryStorage({ [SESSION_KEY]: 's1', [WORKSPACE_KEY]: 'parish-1' });
    const store = createSessionStore(storage);
    expect(await store.getWorkspaceId()).toBe('parish-1');
    await store.setWorkspaceId('parish-2');
    expect(await store.getWorkspaceId()).toBe('parish-2');
    await store.clearWorkspace();
    expect(await store.getSessionId()).toBe('s1');
  });

  it('creates a working storage without crashing when SecureStore is unavailable', async () => {
    const storage = Platform.OS === 'web' ? createFallbackStorage() : await createSecureStorage();
    await storage.setItem(SESSION_KEY, 'web-session');
    expect(await storage.getItem(SESSION_KEY)).toBe('web-session');
    await storage.removeItem(SESSION_KEY);
    expect(await storage.getItem(SESSION_KEY)).toBeNull();
  });
});
