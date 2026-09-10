import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createMobileClient, type MobileClient } from '../api/client';
import type { AuthPayload, BootstrapPayload, MobileUser, Workspace } from '../api/types';
import { createSessionStore, type SessionStore } from './session';
import { createSecureStorage } from './secureStorage';

export type AuthStatus = 'booting' | 'guest' | 'needs2fa' | 'ready';

type AuthValue = {
  status: AuthStatus;
  user: MobileUser | null;
  bootstrap: BootstrapPayload | null;
  workspaceId: string | null;
  api: MobileClient;
  login: (email: string, password: string) => Promise<AuthPayload>;
  verifyTwoFactor: (token: string) => Promise<AuthPayload>;
  requestPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  setWorkspaceId: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

function firstWorkspaceId(bootstrap?: BootstrapPayload | null) {
  return bootstrap?.workspaces?.[0]?.id ?? null;
}

function applyAuthPayload(payload: AuthPayload): { status: AuthStatus; user: MobileUser | null; bootstrap: BootstrapPayload | null } {
  if (!payload.authenticated) {
    return { status: 'guest', user: null, bootstrap: null };
  }
  if (payload.requiresTwoFactor) {
    return { status: 'needs2fa', user: payload.user ?? null, bootstrap: null };
  }
  return {
    status: 'ready',
    user: payload.user ?? null,
    bootstrap: payload.bootstrap ?? null,
  };
}

export function AuthProvider({
  children,
  sessionStore,
  apiFactory,
  initialBaseUrl,
}: {
  children: React.ReactNode;
  sessionStore?: SessionStore;
  apiFactory?: (getToken: () => Promise<string | null>) => MobileClient;
  initialBaseUrl?: string;
}) {
  const [store, setStore] = useState<SessionStore | null>(sessionStore ?? null);
  const [status, setStatus] = useState<AuthStatus>('booting');
  const [user, setUser] = useState<MobileUser | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [workspaceId, setWorkspaceState] = useState<string | null>(null);
  const tokenRef = React.useRef<string | null>(null);

  const api = useMemo(() => {
    const getToken = async () => tokenRef.current ?? (store ? store.getSessionId() : null);
    if (apiFactory) return apiFactory(getToken);
    return createMobileClient({
      getBaseUrl: () =>
        initialBaseUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',
      getToken,
    });
  }, [apiFactory, initialBaseUrl, store]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const resolved = store ?? createSessionStore(await createSecureStorage());
      if (!store) setStore(resolved);
      const sessionId = await resolved.getSessionId();
      tokenRef.current = sessionId;
      const savedWorkspace = await resolved.getWorkspaceId();
      if (savedWorkspace) setWorkspaceState(savedWorkspace);
      if (!sessionId) {
        if (!cancelled) setStatus('guest');
        return;
      }
      try {
        const payload = await api.session();
        if (cancelled) return;
        const next = applyAuthPayload(payload);
        setStatus(next.status);
        setUser(next.user);
        setBootstrap(next.bootstrap);
        if (next.status === 'ready' && !savedWorkspace) {
          const nextWorkspace = firstWorkspaceId(next.bootstrap);
          if (nextWorkspace) {
            setWorkspaceState(nextWorkspace);
            await resolved.setWorkspaceId(nextWorkspace);
          }
        }
        if (next.status === 'guest') {
          tokenRef.current = null;
          await resolved.clearSession();
        }
      } catch {
        if (!cancelled) {
          tokenRef.current = null;
          await resolved.clearSession();
          setStatus('guest');
        }
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [api, store]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      bootstrap,
      workspaceId,
      api,
      async login(email, password) {
        const payload = await api.login(email, password);
        if (payload.sessionId && store) {
          tokenRef.current = payload.sessionId;
          await store.setSessionId(payload.sessionId);
        }
        const next = applyAuthPayload(payload);
        setStatus(next.status);
        setUser(next.user);
        setBootstrap(next.bootstrap);
        const nextWorkspace = firstWorkspaceId(next.bootstrap);
        if (nextWorkspace && store) {
          setWorkspaceState(nextWorkspace);
          await store.setWorkspaceId(nextWorkspace);
        }
        return payload;
      },
      async verifyTwoFactor(token) {
        const payload = await api.verifyTwoFactor(token);
        const next = applyAuthPayload({ ...payload, authenticated: true, requiresTwoFactor: false });
        setStatus(next.status);
        setUser(next.user ?? user);
        setBootstrap(payload.bootstrap ?? next.bootstrap);
        const nextWorkspace = firstWorkspaceId(payload.bootstrap ?? next.bootstrap);
        if (nextWorkspace && store) {
          setWorkspaceState(nextWorkspace);
          await store.setWorkspaceId(nextWorkspace);
        }
        return payload;
      },
      async requestPasswordReset(email) {
        await api.requestPasswordReset(email);
      },
      async logout() {
        try {
          await api.logout();
        } finally {
          tokenRef.current = null;
          if (store) {
            await store.clearSession();
            await store.clearWorkspace();
          }
          setUser(null);
          setBootstrap(null);
          setWorkspaceState(null);
          setStatus('guest');
        }
      },
      async setWorkspaceId(id) {
        setWorkspaceState(id);
        if (store) await store.setWorkspaceId(id);
      },
      async refresh() {
        const payload = await api.session();
        const next = applyAuthPayload(payload);
        setStatus(next.status);
        setUser(next.user);
        setBootstrap(next.bootstrap);
      },
    }),
    [api, bootstrap, status, store, user, workspaceId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}

export function displayName(user: MobileUser | null) {
  if (!user) return 'Catequista';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email || 'Catequista';
}

export function unreadCount(bootstrap: BootstrapPayload | null) {
  const value = bootstrap?.unreadNotifications;
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && typeof value.count === 'number') return value.count;
  return 0;
}

export function listWorkspaces(bootstrap: BootstrapPayload | null): Workspace[] {
  return bootstrap?.workspaces ?? [];
}
