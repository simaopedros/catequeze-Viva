import React, { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import type { MobileClient } from '../api/client';
import { BrandButton, ErrorText, Field, Screen, ScreenTitle } from '../components/ui';

export type FormKind =
  | 'class'
  | 'meeting'
  | 'event'
  | 'conversation'
  | 'announcement'
  | 'group'
  | 'catechumen'
  | 'household'
  | 'team-invite'
  | 'family-invite'
  | 'content'
  | 'sacrament'
  | 'formation'
  | 'parish'
  | 'enroll'
  | 'milestone'
  | 'membership-role';

type FieldDef = { key: string; label: string; multiline?: boolean; placeholder?: string };

const FORMS: Record<
  FormKind,
  {
    title: string;
    createTitle: string;
    editTitle: string;
    fields: FieldDef[];
  }
> = {
  class: {
    title: 'Turma',
    createTitle: 'Nova turma',
    editTitle: 'Editar turma',
    fields: [
      { key: 'name', label: 'Nome' },
      { key: 'location', label: 'Local', placeholder: 'Opcional' },
      { key: 'dayOfWeek', label: 'Dia da semana', placeholder: 'Opcional' },
    ],
  },
  meeting: {
    title: 'Encontro',
    createTitle: 'Novo encontro',
    editTitle: 'Editar encontro',
    fields: [
      { key: 'title', label: 'Título' },
      { key: 'date', label: 'Data (AAAA-MM-DD)' },
      { key: 'theme', label: 'Tema', placeholder: 'Opcional' },
      { key: 'notes', label: 'Notas', multiline: true, placeholder: 'Opcional' },
    ],
  },
  event: {
    title: 'Evento',
    createTitle: 'Novo evento litúrgico',
    editTitle: 'Evento',
    fields: [
      { key: 'name', label: 'Nome' },
      { key: 'date', label: 'Data (AAAA-MM-DD)' },
      { key: 'description', label: 'Descrição', multiline: true, placeholder: 'Opcional' },
    ],
  },
  conversation: {
    title: 'Conversa',
    createTitle: 'Nova conversa',
    editTitle: 'Conversa',
    fields: [{ key: 'title', label: 'Título' }],
  },
  announcement: {
    title: 'Comunicado',
    createTitle: 'Novo comunicado',
    editTitle: 'Comunicado',
    fields: [
      { key: 'title', label: 'Título' },
      { key: 'body', label: 'Texto', multiline: true },
      { key: 'audience', label: 'Público', placeholder: 'all, catechists, families, coordinators' },
    ],
  },
  group: {
    title: 'Grupo',
    createTitle: 'Novo grupo',
    editTitle: 'Grupo',
    fields: [
      { key: 'name', label: 'Nome' },
      { key: 'kind', label: 'Tipo', placeholder: 'PRAYER, YOUTH, FAMILY…' },
      { key: 'description', label: 'Descrição', multiline: true, placeholder: 'Opcional' },
    ],
  },
  catechumen: {
    title: 'Catequizando',
    createTitle: 'Novo catequizando',
    editTitle: 'Editar catequizando',
    fields: [
      { key: 'firstName', label: 'Nome' },
      { key: 'lastName', label: 'Apelido' },
      { key: 'birthDate', label: 'Nascimento (AAAA-MM-DD)', placeholder: 'Opcional' },
    ],
  },
  household: {
    title: 'Família',
    createTitle: 'Nova família',
    editTitle: 'Editar família',
    fields: [
      { key: 'name', label: 'Nome do agregado' },
      { key: 'phone', label: 'Telefone', placeholder: 'Opcional' },
      { key: 'address', label: 'Morada', placeholder: 'Opcional' },
    ],
  },
  'team-invite': {
    title: 'Convite',
    createTitle: 'Convidar à equipe',
    editTitle: 'Convite',
    fields: [
      { key: 'email', label: 'E-mail' },
      { key: 'role', label: 'Papel', placeholder: 'LEAD_CATECHIST, ASSISTANT_CATECHIST…' },
    ],
  },
  'family-invite': {
    title: 'Convite da família',
    createTitle: 'Convidar ao portal da família',
    editTitle: 'Convite',
    fields: [
      { key: 'email', label: 'E-mail' },
      { key: 'role', label: 'Papel', placeholder: 'GUARDIAN ou CATECHUMEN' },
      { key: 'householdId', label: 'ID da família', placeholder: 'Opcional' },
    ],
  },
  content: {
    title: 'Conteúdo',
    createTitle: 'Novo conteúdo',
    editTitle: 'Editar conteúdo',
    fields: [
      { key: 'title', label: 'Título' },
      { key: 'theme', label: 'Tema', placeholder: 'Opcional' },
      { key: 'mainContent', label: 'Texto', multiline: true, placeholder: 'Opcional' },
    ],
  },
  sacrament: {
    title: 'Jornada',
    createTitle: 'Nova jornada sacramental',
    editTitle: 'Editar jornada',
    fields: [
      { key: 'catechumenProfileId', label: 'ID do catequizando' },
      { key: 'templateId', label: 'ID do modelo' },
      { key: 'targetDate', label: 'Data alvo (AAAA-MM-DD)', placeholder: 'Só na edição' },
    ],
  },
  formation: {
    title: 'Formação',
    createTitle: 'Novo percurso',
    editTitle: 'Editar percurso',
    fields: [
      { key: 'name', label: 'Nome' },
      { key: 'description', label: 'Descrição', multiline: true, placeholder: 'Opcional' },
      { key: 'kind', label: 'Tipo', placeholder: 'INITIAL' },
    ],
  },
  parish: {
    title: 'Paróquia',
    createTitle: 'Nova paróquia',
    editTitle: 'Editar paróquia',
    fields: [
      { key: 'name', label: 'Nome' },
      { key: 'city', label: 'Cidade', placeholder: 'Opcional' },
      { key: 'state', label: 'Estado', placeholder: 'Opcional' },
      { key: 'confirmation', label: 'Confirmação para apagar', placeholder: 'DELETAR' },
    ],
  },
  enroll: {
    title: 'Inscrição',
    createTitle: 'Inscrever catequizando',
    editTitle: 'Inscrição',
    fields: [{ key: 'catechumenProfileId', label: 'ID do catequizando' }],
  },
  milestone: {
    title: 'Marco',
    createTitle: 'Atualizar marco',
    editTitle: 'Atualizar marco',
    fields: [
      { key: 'status', label: 'Estado', placeholder: 'PENDING, IN_PROGRESS, COMPLETED' },
      { key: 'notes', label: 'Notas', multiline: true, placeholder: 'Opcional' },
    ],
  },
  'membership-role': {
    title: 'Papel',
    createTitle: 'Alterar papel',
    editTitle: 'Alterar papel',
    fields: [{ key: 'role', label: 'Papel' }],
  },
};

export function EntityFormScreen({
  kind,
  id,
  extras,
  api,
  userId,
  workspaceId,
  onDone,
}: {
  kind: FormKind;
  id?: string;
  extras?: Record<string, string | undefined>;
  api: MobileClient;
  userId?: string | null;
  workspaceId?: string | null;
  onDone: () => void;
}) {
  const spec = FORMS[kind] || FORMS.class;
  const editing = Boolean(id);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of spec.fields) {
      initial[field.key] = extras?.[field.key] || '';
    }
    return initial;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const body = useMemo(() => {
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      const trimmed = value.trim();
      if (trimmed) payload[key] = trimmed;
    }
    if (workspaceId) {
      payload.workspaceId = workspaceId;
      if (kind === 'class' || kind === 'household' || kind === 'catechumen' || kind === 'event') {
        payload.parishId = payload.parishId || workspaceId;
      }
    }
    return payload;
  }, [kind, values, workspaceId]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (kind === 'class') {
        if (editing && id) await api.updateClass(id, body);
        else await api.createClass(body);
      } else if (kind === 'meeting') {
        const payload = { ...body, classId: extras?.classId || body.classId };
        if (editing && id) await api.updateMeeting(id, payload);
        else await api.createMeeting(payload);
      } else if (kind === 'event') {
        await api.createCalendarEvent(body);
      } else if (kind === 'conversation') {
        await api.createConversation({
          type: 'GROUP',
          title: body.title,
          participantUserIds: userId ? [userId] : [],
          parishId: workspaceId,
        });
      } else if (kind === 'announcement') {
        await api.createAnnouncement({
          ...body,
          audience: body.audience || 'all',
          workspaceId,
        });
      } else if (kind === 'group') {
        await api.createGroup({ ...body, kind: body.kind || 'PRAYER', workspaceId });
      } else if (kind === 'catechumen') {
        if (editing && id) await api.updateCatechumen(id, body);
        else await api.createCatechumen(body);
      } else if (kind === 'household') {
        if (editing && id) await api.updateHousehold(id, body);
        else await api.createHousehold(body);
      } else if (kind === 'team-invite') {
        await api.inviteUser({
          email: body.email,
          role: body.role || 'LEAD_CATECHIST',
          parishId: workspaceId,
        });
      } else if (kind === 'family-invite') {
        await api.createFamilyInvite({
          email: body.email,
          role: body.role || 'GUARDIAN',
          parishId: workspaceId,
          householdId: body.householdId,
        });
      } else if (kind === 'content') {
        if (editing && id) await api.updateContent(id, body);
        else await api.createContent(body);
      } else if (kind === 'sacrament') {
        if (editing && id) await api.updateSacrament(id, body);
        else await api.createSacrament(body);
      } else if (kind === 'formation') {
        if (editing && id) await api.updateFormation(id, body);
        else await api.createFormation(body);
      } else if (kind === 'parish') {
        if (editing && id) await api.updateParish(id, body);
        else await api.createParish(body);
      } else if (kind === 'enroll') {
        const classId = extras?.classId || String(body.classId || '');
        await api.enrollCatechumen(classId, String(body.catechumenProfileId));
      } else if (kind === 'milestone') {
        const milestoneId = extras?.milestoneId || id || '';
        await api.updateMilestone(milestoneId, body);
      } else if (kind === 'membership-role') {
        const membershipId = extras?.membershipId || id || '';
        await api.updateMembershipRole(membershipId, String(body.role));
      }
      Alert.alert('Guardado', 'Alteração enviada.');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen testID={`form-${kind}`}>
      <ScreenTitle title={editing ? spec.editTitle : spec.createTitle} />
      <ErrorText message={error} />
      {spec.fields.map((field) => (
        <Field
          key={field.key}
          testID={`field-${field.key}`}
          label={field.label}
          placeholder={field.placeholder}
          value={values[field.key] || ''}
          onChangeText={(text) => setValues((current) => ({ ...current, [field.key]: text }))}
          multiline={field.multiline}
        />
      ))}
      <BrandButton
        label={busy ? 'A guardar…' : 'Guardar'}
        disabled={busy}
        onPress={submit}
        testID="form-submit"
      />
    </Screen>
  );
}

export function isFormKind(value: string | undefined): value is FormKind {
  return Boolean(value && value in FORMS);
}
