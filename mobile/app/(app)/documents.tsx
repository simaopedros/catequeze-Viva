import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useAuth, usePermissions } from '../../src/auth/AuthContext';
import { ConfirmDialog } from '../../src/components/ui';
import { useAsync } from '../../src/hooks/useAsync';
import { useMutation } from '../../src/hooks/useMutation';
import { DocumentsScreen } from '../../src/screens/DocumentsScreen';
import { openDocumentFile } from '../../src/screens/openDocument';

export default function DocumentsRoute() {
  const { api, workspaceId } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.documents(workspaceId || undefined), [workspaceId]);
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  const [pendingReject, setPendingReject] = useState<any | null>(null);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const verify = useMutation((doc: any) => api.verifyDocument(String(doc.id)), { successMessage: 'Documento verificado.', onSuccess: () => void reload() });
  const reject = useMutation((doc: any) => api.rejectDocument(String(doc.id)), { successMessage: 'Documento rejeitado.', onSuccess: () => void reload() });
  const remove = useMutation((doc: any) => api.deleteDocument(String(doc.id)), { successMessage: 'Documento apagado.', onSuccess: () => void reload() });

  return (
    <>
      <DocumentsScreen
        payload={data}
        loading={loading}
        error={error}
        refreshing={refreshing}
        onRefresh={() => void reload()}
        canReview={permissions.canReviewDocuments}
        onUpload={() => router.push('/(app)/documents-upload')}
        onOpen={async (doc) => {
          const access = await api.documentFileAccess(String(doc.id));
          await openDocumentFile(access, doc);
        }}
        onVerify={permissions.canReviewDocuments ? (doc) => verify.run(doc).then(() => undefined) : undefined}
        onReject={permissions.canReviewDocuments ? (doc) => Promise.resolve(setPendingReject(doc)) : undefined}
        onDelete={permissions.canReviewDocuments ? (doc) => Promise.resolve(setPendingDelete(doc)) : undefined}
      />
      <ConfirmDialog
        visible={Boolean(pendingReject)}
        title="Rejeitar documento"
        body="A família será informada de que precisa de enviar um novo ficheiro."
        confirmLabel="Rejeitar"
        destructive
        loading={reject.busy}
        onCancel={() => setPendingReject(null)}
        onConfirm={async () => {
          if (pendingReject) await reject.run(pendingReject);
          setPendingReject(null);
        }}
      />
      <ConfirmDialog
        visible={Boolean(pendingDelete)}
        title="Apagar documento"
        body="O ficheiro é removido definitivamente."
        confirmLabel="Apagar"
        destructive
        loading={remove.busy}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await remove.run(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </>
  );
}
