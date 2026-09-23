import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import type { CatechismListEntry, CatechismPartKey } from '../../../src/catechism/catechismPresentation';
import { MIN_CATECHISM_SEARCH_LENGTH } from '../../../src/catechism/catechismPresentation';
import { appRoutes } from '../../../src/navigation/routes';
import { CatechismHomeScreen } from '../../../src/screens/CatechismScreens';

export default function CatechismRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<CatechismListEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [listMode, setListMode] = useState<'category' | 'search' | null>(null);

  const clearList = useCallback(() => {
    setResults([]);
    setActiveCategory(null);
    setListMode(null);
    setError(null);
  }, []);

  return (
    <CatechismHomeScreen
      results={results}
      searching={searching}
      loading={loading}
      error={error}
      activeCategory={activeCategory}
      listMode={listMode}
      onClearList={listMode ? clearList : undefined}
      onOpenEntry={(number) => router.push(appRoutes.catechismEntry(number) as any)}
      onOpenCategory={async (category: CatechismPartKey) => {
        setLoading(true);
        setSearching(false);
        setError(null);
        setActiveCategory(category);
        setListMode('category');
        try {
          const payload = await api.catechismCategory(category);
          setResults(payload.results ?? []);
        } catch {
          setError('connection');
          setResults([]);
        } finally {
          setLoading(false);
        }
      }}
      onSearch={async (q) => {
        if (q.trim().length < MIN_CATECHISM_SEARCH_LENGTH) return;
        setSearching(true);
        setLoading(true);
        setError(null);
        setActiveCategory(null);
        setListMode('search');
        try {
          const payload = await api.searchCatechism(q.trim());
          setResults(payload.results ?? []);
        } catch {
          setError('connection');
          setResults([]);
        } finally {
          setSearching(false);
          setLoading(false);
        }
      }}
    />
  );
}
