import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { asItems, formatDate, personName } from '../../src/lib/payload';
import { CatalogScreen } from '../../src/screens/CatalogScreen';

export default function BirthdaysRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.birthdays(), []);
  const items = asItems(data).map((row: any) => {
    const profile = row.catechumenProfile || row;
    return {
      id: profile.id || row.id,
      title: personName(profile, 'Catequizando'),
      subtitle: formatDate(profile.birthDate || row.nextBirthday || row.date),
    };
  });

  return (
    <CatalogScreen
      testID="birthdays-screen"
      title="Aniversariantes"
      subtitle="Próximos 30 dias neste espaço."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Sem aniversários"
      emptyBody="Não há aniversários nos próximos 30 dias."
      onOpen={(id) => router.push(`/(app)/catechumens/${id}`)}
    />
  );
}
