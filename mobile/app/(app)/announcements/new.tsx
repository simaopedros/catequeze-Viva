import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { SelectField, SwitchField } from '../../../src/components/forms';
import { BrandButton, ErrorText, Field, Screen, ScreenTitle } from '../../../src/components/ui';
import { useMutation } from '../../../src/hooks/useMutation';

export default function NewAnnouncementRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<string | null>('coordinators');
  const [requireAck, setRequireAck] = useState(true);
  const [publishNow, setPublishNow] = useState(true);
  const [touched, setTouched] = useState(false);

  const create = useMutation(
    async () => {
      const created = await api.createAnnouncement({ title: title.trim(), body: body.trim(), audience: audience ?? undefined, requireAck, workspaceId: workspaceId || undefined });
      if (publishNow && created?.id) await api.publishAnnouncement(created.id);
      return created;
    },
    { successMessage: publishNow ? 'Aviso publicado.' : 'Aviso guardado como rascunho.', onSuccess: () => router.back() },
  );

  const titleError = touched && title.trim().length < 2 ? 'Indique um título.' : null;
  const bodyError = touched && body.trim().length < 1 ? 'Escreva o conteúdo do aviso.' : null;

  return (
    <Screen testID="announcement-form">
      <ScreenTitle title="Novo aviso pastoral" subtitle="Comunicação para a equipa ou para as famílias." />
      <ErrorText message={create.error} />
      <Field label="Título" icon="format-title" value={title} onChangeText={setTitle} autoCapitalize="sentences" error={titleError} testID="announcement-title" />
      <Field label="Mensagem" icon="text" value={body} onChangeText={setBody} multiline numberOfLines={6} autoCapitalize="sentences" error={bodyError} testID="announcement-body" />
      <SelectField
        label="Destinatários"
        icon="account-group-outline"
        value={audience}
        onChange={setAudience}
        options={[
          { value: 'coordinators', label: 'Coordenadores' },
          { value: 'catechists', label: 'Catequistas' },
          { value: 'families', label: 'Famílias' },
          { value: 'all', label: 'Todos' },
        ]}
        testID="announcement-audience"
      />
      <SwitchField label="Pedir confirmação de leitura" hint="Cada destinatário confirma que leu." value={requireAck} onChange={setRequireAck} icon="check-all" />
      <SwitchField label="Publicar já" hint="Se desligado, fica como rascunho para publicar na web." value={publishNow} onChange={setPublishNow} icon="publish" />
      <BrandButton
        testID="announcement-submit"
        icon={publishNow ? 'bullhorn-outline' : 'content-save-outline'}
        label={create.busy ? 'A guardar…' : publishNow ? 'Publicar aviso' : 'Guardar rascunho'}
        loading={create.busy}
        disabled={create.busy}
        onPress={() => {
          setTouched(true);
          if (title.trim().length < 2 || body.trim().length < 1) return;
          void create.run();
        }}
      />
    </Screen>
  );
}
