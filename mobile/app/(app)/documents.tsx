import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { DocumentsScreen } from '../../src/screens/DocumentsScreen';
import { copy } from '../../src/copy/ptBR';
import { useToast } from '../../src/feedback/Toast';

export default function DocumentsRoute() {
  const { api, workspaceId } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.documents(), []);
  const [uploading, setUploading] = useState(false);

  return (
    <DocumentsScreen
      payload={data}
      loading={loading}
      error={error}
      onRefresh={() => void reload()}
      refreshing={refreshing}
      uploading={uploading}
      apiBase={process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'}
      onUpload={async () => {
        const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
        if (picked.canceled || !picked.assets?.[0]) return;
        const file = picked.assets[0];
        setUploading(true);
        try {
          await api.uploadDocument(
            { uri: file.uri, name: file.name, type: file.mimeType || 'application/pdf' },
            { name: file.name, type: 'OTHER', parishId: workspaceId || undefined },
          );
          toast.show(copy.documents.uploaded);
          await reload();
        } finally {
          setUploading(false);
        }
      }}
    />
  );
}
