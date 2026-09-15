import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert } from 'react-native';
import { useAuth, workspaceNavContext } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { canManagePastoral } from '../../src/lib/roleAccess';
import { DocumentsScreen } from '../../src/screens/DocumentsScreen';

export default function DocumentsRoute() {
  const { api, workspaceId, bootstrap } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.documents(), []);
  const nav = workspaceNavContext(bootstrap, workspaceId);
  const canWrite = canManagePastoral(nav.role, nav.isAdmin) || nav.role === 'GUARDIAN';

  return (
    <DocumentsScreen
      payload={data}
      loading={loading}
      error={error}
      apiBase={process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'}
      canWrite={canWrite}
      onUpload={async () => {
        const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
        if (picked.canceled || !picked.assets?.[0]) return;
        const asset = picked.assets[0];
        try {
          await api.uploadDocument(
            {
              uri: asset.uri,
              name: asset.fileName || 'documento.jpg',
              type: asset.mimeType || 'image/jpeg',
            },
            {
              name: asset.fileName || 'Documento',
              type: 'OTHER',
              parishId: workspaceId || '',
            },
          );
          await reload();
        } catch (err) {
          Alert.alert('Envio falhou', err instanceof Error ? err.message : '');
        }
      }}
      onVerify={async (id) => {
        try {
          await api.verifyDocument(id);
          await reload();
        } catch (err) {
          Alert.alert('Validação falhou', err instanceof Error ? err.message : '');
        }
      }}
    />
  );
}
