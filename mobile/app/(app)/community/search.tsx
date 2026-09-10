import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { SearchScreen } from '../../../src/screens/SearchScreen';
import type { SocialSearch } from '../../../src/api/types';

export default function SearchRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SocialSearch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setError(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const next = await api.searchSocial(q);
        if (!cancelled) setResults(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Pesquisa falhou.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [api, query]);

  return (
    <SearchScreen
      query={query}
      onChangeQuery={setQuery}
      results={results}
      loading={loading}
      error={error}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onOpenPost={(slug) => router.push(`/(app)/community/p/${slug}`)}
    />
  );
}
