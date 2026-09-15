import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { BillingScreen } from '../../src/screens/BillingScreen';

export default function BillingRoute() {
  const { api } = useAuth();
  const { data, loading, error } = useAsync(() => api.billing(), []);
  return <BillingScreen data={data} loading={loading} error={error} />;
}
