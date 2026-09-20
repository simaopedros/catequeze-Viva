import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { CatalogListScreen, FormScreen } from './CatalogListScreen';
import { asItems, displayPerson } from '../format';
import { copy } from '../copy/ptBR';
import { openWebDestination } from '../lib/openWeb';
import { labelFor } from '../navigation/visible';
import { GroupedList, ListRow, Screen, ScreenTitle, LoadingState, ErrorState, ReaderFrame, AppText } from '../components/ui';

export function PeopleCatechumensScreen() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const [payload, setPayload] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setError(null);
      const data = await api.catechumens(workspaceId || undefined);
      setPayload(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.catalog.error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, workspaceId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <CatalogListScreen
      testID="catechumens-screen"
      title={copy.people.catechumensTitle}
      subtitle={copy.people.catechumensSubtitle}
      payload={payload}
      loading={loading}
      error={error}
      emptyTitle={copy.people.catechumensEmpty}
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
      refreshing={refreshing}
      onCreate={() => router.push('/(app)/people/catechumens/new')}
      createLabel={copy.people.newCatechumen}
      onSecondary={() => void openWebDestination(api, '/app/catechumens/import')}
      secondaryLabel={copy.people.importCsv}
      mapItem={(item) => ({
        id: item.id,
        title: displayPerson(item),
        meta: item.household?.name || item.email,
      })}
      onOpen={(id) => router.push(`/(app)/people/catechumens/${id}`)}
    />
  );
}

export function NewCatechumenScreen() {
  const { api } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <FormScreen
      title={copy.people.newCatechumen}
      error={error}
      busy={busy}
      fields={[
        { key: 'firstName', label: copy.people.firstName, value: firstName, onChange: setFirstName },
        { key: 'lastName', label: copy.people.lastName, value: lastName, onChange: setLastName },
        { key: 'email', label: copy.auth.email, value: email, onChange: setEmail },
      ]}
      onSubmit={async () => {
        setBusy(true);
        setError(null);
        try {
          await api.createCatechumen({ firstName, lastName, email });
          router.back();
        } catch (err) {
          setError(err instanceof Error ? err.message : copy.catalog.error);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

export function CatechismBrowser() {
  const { api } = useAuth();
  const router = useRouter();
  const [category, setCategory] = useState('creed');
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.catechism({ category });
        if (!cancelled) setPayload(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : copy.catalog.error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, category]);

  const items = asItems(payload?.items);
  const categories: string[] = payload?.categories || ['creed', 'sacraments', 'commandments', 'prayer', 'virtues', 'sin'];

  return (
    <Screen tone="paper">
      <ScreenTitle title={labelFor('catechism')} />
      <ViewChips categories={categories} category={category} onChange={setCategory} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.catalog.error} body={error} /> : null}
      <GroupedList>
        {items.map((item: any) => (
          <ListRow
            key={item.id || item.number}
            title={`${item.number}. ${item.question || item.title || ''}`}
            onPress={() => router.push(`/(app)/content/catechism/${item.number}`)}
          />
        ))}
      </GroupedList>
    </Screen>
  );
}

function ViewChips({
  categories,
  category,
  onChange,
}: {
  categories: string[];
  category: string;
  onChange: (value: string) => void;
}) {
  return (
    <GroupedList header={copy.catalog.categories}>
      {categories.map((item) => (
        <ListRow key={item} title={item} selected={item === category} onPress={() => onChange(item)} />
      ))}
    </GroupedList>
  );
}

export function CatechismEntryScreen({ number }: { number: number }) {
  const { api } = useAuth();
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        setEntry(await api.catechismEntry(number));
      } catch (err) {
        setError(err instanceof Error ? err.message : copy.catalog.error);
      } finally {
        setLoading(false);
      }
    })();
  }, [api, number]);
  return (
    <Screen tone="paper">
      <ScreenTitle title={entry?.question || `n.º ${number}`} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.catalog.error} body={error} /> : null}
      {entry?.answer ? (
        <ReaderFrame>
          <AppText variant="body">{entry.answer}</AppText>
        </ReaderFrame>
      ) : null}
    </Screen>
  );
}
