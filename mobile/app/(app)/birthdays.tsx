import { useAuth } from '../../src/auth/AuthContext';
import { copy } from '../../src/copy/ptBR';
import { displayPerson, formatDay } from '../../src/format';
import { useAsync } from '../../src/hooks/useAsync';
import { CatalogListScreen } from '../../src/screens/CatalogListScreen';

export default function BirthdaysRoute() {
  const { api } = useAuth();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.birthdays(), []);
  return (
    <CatalogListScreen
      title={copy.birthdays.title}
      payload={data}
      loading={loading}
      error={error}
      emptyTitle={copy.birthdays.empty}
      onRefresh={() => void reload()}
      refreshing={refreshing}
      mapItem={(item: any) => ({
        id: item.id || item.catechumenProfileId,
        title: displayPerson(item.catechumenProfile || item),
        meta: formatDay(item.birthDate || item.date),
      })}
    />
  );
}
