import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { asItems } from '../../../src/lib/payload';
import { SearchReferenceScreen } from '../../../src/screens/SearchReferenceScreen';

export default function CatechismRoute() {
  const { api } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <SearchReferenceScreen
      testID="catechism-screen"
      title="Catecismo"
      subtitle="Pesquise números e textos do Catecismo da Igreja Católica. Os dados estão em pt-BR, como na web."
      placeholder="ex.: Trindade"
      query={query}
      onChangeQuery={setQuery}
      loading={loading}
      error={error}
      results={asItems(results).map((row: any) => ({
        id: String(row.number ?? row.id),
        title: `${row.number ?? ''} · ${row.question || row.title || 'Artigo'}`,
        subtitle: row.answer || row.text,
      }))}
      emptyTitle="Comece a pesquisar"
      emptyBody="Escreva pelo menos 3 letras para procurar no catecismo."
      onSearch={async () => {
        setLoading(true);
        setError(null);
        try {
          const payload = await api.catechismSearch(query.trim());
          setResults(asItems(payload));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Pedido falhou.');
        } finally {
          setLoading(false);
        }
      }}
    />
  );
}
