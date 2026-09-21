import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { PersonDetailScreen } from '../../../src/screens/PeopleScreens';

export default function CatechumenRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const { data, loading, error } = useAsync(() => api.catechumen(String(id)), [id]);
  const classes = (data?.enrollments || [])
    .map((item: any) => item.class?.name)
    .filter(Boolean)
    .join(', ');
  return (
    <PersonDetailScreen
      title="Catequizando"
      payload={data}
      loading={loading}
      error={error}
      lines={[
        { label: 'Turma', value: classes },
        { label: 'Família', value: data?.household?.name },
        { label: 'Paróquia', value: data?.parish?.name },
        { label: 'E-mail', value: data?.email },
        { label: 'Telefone', value: data?.phone },
      ]}
    />
  );
}
