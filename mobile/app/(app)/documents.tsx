import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { DocumentsScreen } from '../../src/screens/DocumentsScreen';

export default function DocumentsRoute() {
  const { api } = useAuth();
  const { data, loading, error } = useAsync(() => api.documents(), []);

  return (
    <DocumentsScreen
      payload={data}
      loading={loading}
      error={error}
      apiBase={process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'}
    />
  );
}
