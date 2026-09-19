import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import type { GlobalSearchResult } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { useFeedback } from '../../src/components/Feedback';
import { GlobalSearchScreen, searchResultRoute } from '../../src/screens/GlobalSearchScreen';

export default function GlobalSearchRoute() {
  const { api } = useAuth();
  const { notify } = useFeedback();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.globalSearch(trimmed);
        if (!cancelled) setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Pesquisa indisponível.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <GlobalSearchScreen
      query={query}
      onChangeQuery={setQuery}
      results={results}
      loading={loading}
      error={error}
      onOpen={(result) => {
        const route = searchResultRoute(result);
        if (route) router.push(route as any);
        else notify('Este resultado só está disponível na plataforma web.', 'info');
      }}
    />
  );
}
