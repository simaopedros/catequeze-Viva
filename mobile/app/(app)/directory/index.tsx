import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { asItems } from '../../../src/lib/payload';
import { SearchReferenceScreen } from '../../../src/screens/SearchReferenceScreen';

export default function DirectoryRoute() {
  const { api } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <SearchReferenceScreen
      testID="directory-screen"
      title="Diretório"
      subtitle="Pesquise o Diretório para a Catequese. Os dados estão em pt-BR, como na web."
      placeholder="ex.: iniciação"
      query={query}
      onChangeQuery={setQuery}
      loading={loading}
      error={error}
      results={asItems(results).map((row: any) => ({
        id: String(row.number ?? row.id),
        title: `${row.number ?? ''} · ${row.title || row.part || 'Entrada'}`,
        subtitle: row.text || row.excerpt,
      }))}
      emptyTitle="Comece a pesquisar"
      emptyBody="Escreva pelo menos 2 letras para procurar no diretório."
    />
  );
}
