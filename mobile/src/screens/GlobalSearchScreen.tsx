import React, { useMemo } from 'react';
import type { GlobalSearchResult } from '../api/client';
import { EmptyState, ListCard, ListRow, Screen, ScreenTitle, SearchBar, SectionHeader, SkeletonList, type IconName } from '../components/ui';

const TYPE_META: Record<string, { label: string; icon: IconName }> = {
  catechumen: { label: 'Catequizandos', icon: 'account-child-outline' },
  class: { label: 'Turmas', icon: 'school-outline' },
  family: { label: 'Famílias', icon: 'home-heart' },
  content: { label: 'Conteúdos', icon: 'book-open-page-variant-outline' },
  bible: { label: 'Bíblia', icon: 'book-cross' },
  catechism: { label: 'Catecismo', icon: 'book-outline' },
  directory: { label: 'Diretório', icon: 'book-information-variant' },
  sacrament: { label: 'Sacramentos', icon: 'cross-outline' },
  document: { label: 'Documentos', icon: 'file-document-outline' },
  parish: { label: 'Paróquias', icon: 'church' },
  community: { label: 'Comunidades', icon: 'home-group' },
};

export function GlobalSearchScreen({
  query,
  onChangeQuery,
  results,
  loading,
  error,
  onOpen,
}: {
  query: string;
  onChangeQuery: (value: string) => void;
  results: GlobalSearchResult[];
  loading?: boolean;
  error?: string | null;
  onOpen: (result: GlobalSearchResult) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, GlobalSearchResult[]>();
    for (const result of results) map.set(result.type, [...(map.get(result.type) ?? []), result]);
    return Array.from(map.entries());
  }, [results]);
  const short = query.trim().length < 2;

  return (
    <Screen testID="global-search-screen">
      <ScreenTitle title="Pesquisar" subtitle="Catequizandos, turmas, famílias, conteúdos e Bíblia." />
      <SearchBar value={query} onChangeText={onChangeQuery} placeholder="Escreva pelo menos 2 letras" testID="global-search-input" autoFocus />
      {loading ? <SkeletonList rows={3} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Pesquisa indisponível" body={error} /> : null}
      {short && !loading ? <EmptyState icon="magnify" title="Comece a escrever" body="A pesquisa abrange toda a paróquia a que tem acesso." /> : null}
      {!short && !loading && !error && results.length === 0 ? <EmptyState icon="magnify-close" title="Nada encontrado" body="Tente outro nome ou palavra." /> : null}
      {grouped.map(([type, items]) => {
        const meta = TYPE_META[type] ?? { label: type, icon: 'magnify' as IconName };
        return (
          <React.Fragment key={type}>
            <SectionHeader title={meta.label} icon={meta.icon} />
            <ListCard>
              {items.map((item, index) => (
                <ListRow
                  key={`${type}-${item.id}`}
                  testID={`search-${type}-${item.id}`}
                  icon={meta.icon}
                  title={item.label}
                  subtitle={item.description || undefined}
                  onPress={() => onOpen(item)}
                  last={index === items.length - 1}
                />
              ))}
            </ListCard>
          </React.Fragment>
        );
      })}
    </Screen>
  );
}

/** Traduz a rota web devolvida pela pesquisa para a rota equivalente na app. */
export function searchResultRoute(result: GlobalSearchResult): string | null {
  switch (result.type) {
    case 'catechumen':
      return `/(app)/catechumen/${result.id}`;
    case 'class':
      return `/(app)/class/${result.id}`;
    case 'family':
      return `/(app)/family/${result.id}`;
    case 'document':
      return '/(app)/documents';
    case 'bible': {
      const match = /\/app\/bible\/?\?book=([^&]+)&chapter=(\d+)/.exec(result.route ?? '');
      return match ? `/(app)/bible/${match[1]}/${match[2]}` : '/(app)/bible';
    }
    case 'content':
      return `/(app)/content/${result.id}`;
    case 'catechism':
      return `/(app)/catechism?entry=${encodeURIComponent(result.id)}`;
    case 'directory':
      return `/(app)/directory?entry=${encodeURIComponent(result.id)}`;
    default:
      return null;
  }
}
