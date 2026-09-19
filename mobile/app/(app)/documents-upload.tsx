import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text } from 'react-native-paper';
import type { UploadFileInput } from '../../src/api/client';
import { useAuth, usePermissions } from '../../src/auth/AuthContext';
import { SelectField } from '../../src/components/forms';
import { BrandButton, Card, ErrorText, Field, Icon, Row, Screen, ScreenTitle } from '../../src/components/ui';
import { useAsync } from '../../src/hooks/useAsync';
import { useMutation } from '../../src/hooks/useMutation';
import { asCatechumenList } from '../../src/screens/CatechumensListScreen';
import { pickDocumentFile } from '../../src/screens/pickFile';
import { colors } from '../../src/theme';
import { fullName } from '../../src/utils/format';

const DOCUMENT_TYPES = [
  { value: 'BAPTISM_CERTIFICATE', label: 'Certidão de batismo' },
  { value: 'BIRTH_CERTIFICATE', label: 'Certidão de nascimento' },
  { value: 'CONSENT_FORM', label: 'Autorização / consentimento' },
  { value: 'MARRIAGE_CERTIFICATE', label: 'Certidão de casamento' },
  { value: 'PASTORAL_LETTER', label: 'Carta pastoral' },
  { value: 'OTHER', label: 'Outro' },
];

export default function DocumentUploadRoute() {
  const { api, workspaceId } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const catechumens = useAsync(() => (permissions.canOperate ? api.catechumens({ workspaceId: workspaceId || undefined }) : Promise.resolve([])), [workspaceId]);
  const [file, setFile] = useState<UploadFileInput | null>(null);
  const [fileLabel, setFileLabel] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<string | null>('BAPTISM_CERTIFICATE');
  const [catechumenId, setCatechumenId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const upload = useMutation(
    () => api.uploadDocument(file as UploadFileInput, { name: name.trim() || fileLabel, type: type ?? 'OTHER', catechumenProfileId: catechumenId ?? undefined, parishId: workspaceId || undefined }),
    { successMessage: 'Documento carregado.', onSuccess: () => router.back() },
  );

  return (
    <Screen testID="document-upload-screen">
      <ScreenTitle title="Carregar documento" subtitle="PDF ou imagem até 10 MB." />
      <ErrorText message={upload.error} />
      <Card onPress={async () => {
        const picked = await pickDocumentFile();
        if (picked) {
          setFile(picked);
          const label = 'name' in picked ? picked.name : 'ficheiro';
          setFileLabel(label);
          if (!name) setName(label.replace(/\.[a-z0-9]+$/i, ''));
        }
      }} testID="pick-document">
        <Row>
          <Icon name={file ? 'file-check-outline' : 'file-upload-outline'} size={28} color={file ? colors.success : colors.goldDark} />
          <Text variant="bodyLarge" style={{ color: colors.ink, flex: 1 }}>
            {file ? fileLabel : 'Escolher ficheiro'}
          </Text>
          <Icon name="chevron-right" color={colors.muted} />
        </Row>
      </Card>
      {touched && !file ? <ErrorText message="Escolha um ficheiro." /> : null}
      <Field label="Nome do documento" icon="format-title" value={name} onChangeText={setName} autoCapitalize="sentences" testID="document-name" />
      <SelectField label="Tipo" icon="tag-outline" value={type} onChange={setType} options={DOCUMENT_TYPES} testID="document-type" />
      {permissions.canOperate ? (
        <SelectField
          label="Catequizando"
          icon="account-child-outline"
          value={catechumenId}
          onChange={setCatechumenId}
          options={asCatechumenList(catechumens.data).map((item) => ({ value: item.id, label: fullName(item) }))}
          allowClear
          helper="Opcional — liga o documento à ficha do catequizando."
          testID="document-catechumen"
        />
      ) : null}
      <BrandButton
        testID="document-submit"
        icon="upload"
        label={upload.busy ? 'A enviar…' : 'Carregar'}
        loading={upload.busy}
        disabled={upload.busy}
        onPress={() => {
          setTouched(true);
          if (!file) return;
          void upload.run();
        }}
      />
    </Screen>
  );
}
