import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { copy } from '../../../../src/copy/ptBR';
import { FormScreen } from '../../../../src/screens/CatalogListScreen';

export default function NewFamilyRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <FormScreen
      title={copy.people.newFamily}
      busy={busy}
      error={error}
      fields={[{ key: 'name', label: copy.people.familyName, value: name, onChange: setName }]}
      onSubmit={async () => {
        setBusy(true);
        setError(null);
        try {
          await api.createFamily({ name, parishId: workspaceId || undefined });
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
