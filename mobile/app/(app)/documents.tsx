import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { DocumentsScreen } from '../../src/screens/DocumentsScreen';
import { openDocumentFile } from '../../src/screens/openDocument';

export default function DocumentsRoute() {
  const { api } = useAuth();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.documents(), []);

  return (
    <DocumentsScreen
      payload={data}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      onOpen={async (doc) => {
        const access = await api.documentFileAccess(String(doc.id));
        await openDocumentFile(access, doc);
      }}
    />
  );
}
