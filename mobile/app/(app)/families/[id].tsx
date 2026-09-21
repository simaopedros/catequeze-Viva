import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { PersonDetailScreen } from '../../../src/screens/PeopleScreens';
import { personName } from '../../../src/format';

export default function FamilyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const { data, loading, error } = useAsync(() => api.family(String(id)), [id]);
  const members = (data?.catechumens || data?.members || data?.guardians || [])
    .map((item: any) => personName(item))
    .filter(Boolean)
    .join(', ');
  return (
    <PersonDetailScreen
      title="Família"
      payload={data}
      loading={loading}
      error={error}
      lines={[
        { label: 'Membros', value: members },
        { label: 'Paróquia', value: data?.parish?.name },
        { label: 'Telefone', value: data?.phone },
        { label: 'Notas', value: data?.notes },
      ]}
    />
  );
}
