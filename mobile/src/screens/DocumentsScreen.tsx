import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { BrandButton, Card, EmptyState, ErrorText, Icon, IconAction, PrimaryFab, Row, Screen, ScreenTitle, SkeletonList, Tag, type IconName } from '../components/ui';
import { colors, spacing } from '../theme';
import { formatDate, fullName } from '../utils/format';

function asDocuments(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.documents)) return payload.documents;
  return [];
}

const STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  VERIFIED: { label: 'Verificado', tone: 'success' },
  APPROVED: { label: 'Verificado', tone: 'success' },
  PENDING: { label: 'Por verificar', tone: 'warning' },
  UPLOADED: { label: 'Por verificar', tone: 'warning' },
  REJECTED: { label: 'Rejeitado', tone: 'danger' },
};

const KIND_LABEL: Record<string, string> = {
  BAPTISM_CERTIFICATE: 'Certidão de batismo',
  BIRTH_CERTIFICATE: 'Certidão de nascimento',
  ID: 'Identificação',
  PHOTO: 'Fotografia',
  AUTHORIZATION: 'Autorização',
  OTHER: 'Outro',
};

function iconFor(doc: any): IconName {
  const mime = String(doc.mimeType || '');
  if (mime.startsWith('image/')) return 'file-image-outline';
  if (mime.includes('pdf')) return 'file-pdf-box';
  return 'file-document-outline';
}

export function DocumentsScreen({
  payload,
  loading,
  error,
  onOpen,
  onUpload,
  onVerify,
  onReject,
  onDelete,
  refreshing,
  onRefresh,
  canReview,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onOpen: (doc: any) => Promise<void> | void;
  onUpload?: () => void;
  onVerify?: (doc: any) => Promise<void> | void;
  onReject?: (doc: any) => Promise<void> | void;
  onDelete?: (doc: any) => Promise<void> | void;
  refreshing?: boolean;
  onRefresh?: () => void;
  canReview?: boolean;
}) {
  const items = asDocuments(payload);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  async function run(doc: any, action: (doc: any) => Promise<void> | void) {
    setBusyId(doc.id);
    setOpenError(null);
    try {
      await action(doc);
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'Não foi possível concluir a ação.');
    } finally {
      setBusyId(null);
    }
  }

  const pending = items.filter((doc: any) => ['PENDING', 'UPLOADED'].includes(String(doc.status))).length;

  return (
    <Screen
      testID="documents-screen"
      refreshing={refreshing}
      onRefresh={onRefresh}
      fab={onUpload ? <PrimaryFab icon="upload" label="Carregar" onPress={onUpload} testID="upload-document" /> : undefined}
    >
      <ScreenTitle title="Documentos" subtitle={pending > 0 ? `${pending} por verificar` : 'Ficheiros da família e da turma.'} />
      {loading && items.length === 0 ? <SkeletonList rows={3} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Documentos indisponíveis" body={error} /> : null}
      <ErrorText message={openError} />
      {items.length === 0 && !loading && !error ? (
        <EmptyState icon="folder-open-outline" title="Pasta vazia" body="Ainda não há documentos para mostrar." action={onUpload ? 'Carregar documento' : undefined} onAction={onUpload} />
      ) : (
        items.map((doc: any) => {
          const status = doc.status ? STATUS[String(doc.status)] : null;
          const owner = doc.catechumenProfile || doc.catechumen;
          return (
            <Card key={doc.id} testID={`document-${doc.id}`}>
              <Row gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={iconFor(doc)} size={22} color={colors.goldDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ color: colors.ink }}>
                    {doc.title || doc.name || doc.fileName || 'Documento'}
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.muted, marginTop: 2 }}>
                    {[KIND_LABEL[String(doc.kind)] || doc.kind, owner ? fullName(owner) : null, formatDate(doc.createdAt)].filter(Boolean).join(' · ')}
                  </Text>
                  {doc.rejectionReason ? (
                    <Text variant="bodySmall" style={{ color: colors.danger, marginTop: 4 }}>
                      Motivo: {doc.rejectionReason}
                    </Text>
                  ) : null}
                </View>
                {status ? <Tag label={status.label} tone={status.tone} /> : null}
              </Row>
              <Row style={{ marginTop: spacing.xs }}>
                <BrandButton
                  variant="tonal"
                  icon="open-in-new"
                  label={busyId === doc.id ? 'A abrir…' : 'Abrir'}
                  disabled={busyId !== null}
                  onPress={() => void run(doc, onOpen)}
                  style={{ flex: 1 }}
                />
                {canReview && onVerify && status?.tone !== 'success' ? (
                  <IconAction icon="check" label="Verificar" tone="gold" onPress={() => void run(doc, onVerify)} testID={`verify-${doc.id}`} />
                ) : null}
                {canReview && onReject && status?.tone !== 'danger' ? (
                  <IconAction icon="close" label="Rejeitar" onPress={() => void run(doc, onReject)} testID={`reject-${doc.id}`} />
                ) : null}
                {onDelete ? <IconAction icon="delete-outline" label="Apagar" onPress={() => void run(doc, onDelete)} testID={`delete-${doc.id}`} /> : null}
              </Row>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
