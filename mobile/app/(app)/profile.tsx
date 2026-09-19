import { Redirect } from 'expo-router';
import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { BrandButton, EmptyState, LoadingState, Screen } from '../../src/components/ui';

export default function MyProfileRoute() {
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.mySocialProfile(), []);
  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen>
        <EmptyState title="Perfil indisponível" body={error} />
        <BrandButton variant="ghost" label="Tentar novamente" onPress={() => void reload()} />
      </Screen>
    );
  }
  if (data?.handle) {
    return <Redirect href={`/(app)/community/${data.handle}`} />;
  }
  return <Redirect href="/(app)/(tabs)/more" />;
}
