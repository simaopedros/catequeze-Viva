import React, { useEffect, useState } from 'react';
import { Text } from 'react-native-paper';
import type { ClassInput } from '../api/client';
import { DAY_OF_WEEK_OPTIONS, SelectField, TimeField, type SelectOption } from '../components/forms';
import { BrandButton, Card, ErrorText, Field, Row, Screen, ScreenTitle, SectionHeader } from '../components/ui';
import { colors, spacing } from '../theme';

export type ClassFormValues = ClassInput & { status?: string };

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'ACTIVE', label: 'Ativa' },
  { value: 'PAUSED', label: 'Pausada' },
  { value: 'CONCLUDED', label: 'Concluída' },
  { value: 'ARCHIVED', label: 'Arquivada' },
];

export function ClassFormScreen({
  initial,
  communities,
  busy,
  error,
  onSubmit,
  mode,
}: {
  initial?: Partial<ClassFormValues> | null;
  communities: { id: string; name: string }[];
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: ClassFormValues) => Promise<void> | void;
  mode: 'create' | 'edit';
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [communityId, setCommunityId] = useState<string | null>(initial?.communityId ?? null);
  const [dayOfWeek, setDayOfWeek] = useState<string | null>(initial?.dayOfWeek ?? null);
  const [startTime, setStartTime] = useState<string | null>(initial?.startTime ?? null);
  const [endTime, setEndTime] = useState<string | null>(initial?.endTime ?? null);
  const [location, setLocation] = useState(initial?.location ?? '');
  const [maxCapacity, setMaxCapacity] = useState(initial?.maxCapacity ? String(initial.maxCapacity) : '30');
  const [status, setStatus] = useState<string | null>(initial?.status ?? null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setName(initial.name ?? '');
    setCommunityId(initial.communityId ?? null);
    setDayOfWeek(initial.dayOfWeek ?? null);
    setStartTime(initial.startTime ?? null);
    setEndTime(initial.endTime ?? null);
    setLocation(initial.location ?? '');
    setMaxCapacity(initial.maxCapacity ? String(initial.maxCapacity) : '30');
    setStatus(initial.status ?? null);
  }, [initial]);

  const nameError = touched && name.trim().length < 3 ? 'O nome deve ter pelo menos 3 caracteres.' : null;
  const capacity = Number.parseInt(maxCapacity, 10);
  const capacityError = touched && (!Number.isFinite(capacity) || capacity < 1 || capacity > 200) ? 'Entre 1 e 200.' : null;

  return (
    <Screen testID="class-form-screen">
      <ScreenTitle title={mode === 'create' ? 'Nova turma' : 'Editar turma'} subtitle="Defina o nome, o horário e a comunidade da turma." />
      <ErrorText message={error} />
      <Field label="Nome da turma" icon="school-outline" value={name} onChangeText={setName} autoCapitalize="sentences" error={nameError} testID="class-name" />
      <SelectField
        label="Comunidade"
        icon="church"
        value={communityId}
        options={communities.map((community) => ({ value: community.id, label: community.name }))}
        onChange={setCommunityId}
        allowClear
        helper={communities.length === 0 ? 'Sem comunidades neste espaço — a turma fica ao nível da paróquia.' : undefined}
        testID="class-community"
      />
      <SectionHeader title="Horário" icon="calendar-clock-outline" />
      <SelectField label="Dia da semana" icon="calendar-week" value={dayOfWeek} options={DAY_OF_WEEK_OPTIONS} onChange={setDayOfWeek} allowClear testID="class-day" />
      <Row style={{ alignItems: 'flex-start' }}>
        <TimeField label="Início" value={startTime} onChange={setStartTime} testID="class-start" />
        <TimeField label="Fim" value={endTime} onChange={setEndTime} icon="clock-check-outline" testID="class-end" />
      </Row>
      <Field label="Local" icon="map-marker-outline" value={location} onChangeText={setLocation} autoCapitalize="sentences" testID="class-location" />
      <Field label="Capacidade máxima" icon="account-multiple-outline" value={maxCapacity} onChangeText={setMaxCapacity} keyboardType="number-pad" error={capacityError} testID="class-capacity" />
      {mode === 'edit' ? <SelectField label="Estado" icon="flag-outline" value={status} options={STATUS_OPTIONS} onChange={setStatus} testID="class-status" /> : null}
      <Card tone="paper">
        <Text variant="bodySmall" style={{ color: colors.muted }}>
          Os catequistas e os catequizandos são adicionados depois, a partir do detalhe da turma.
        </Text>
      </Card>
      <BrandButton
        testID="class-submit"
        icon="content-save-outline"
        label={busy ? 'A guardar…' : mode === 'create' ? 'Criar turma' : 'Guardar alterações'}
        loading={busy}
        disabled={busy}
        onPress={() => {
          setTouched(true);
          if (name.trim().length < 3 || !Number.isFinite(capacity) || capacity < 1 || capacity > 200) return;
          void onSubmit({
            name: name.trim(),
            communityId: communityId ?? null,
            dayOfWeek: dayOfWeek ?? undefined,
            startTime: startTime ?? undefined,
            endTime: endTime ?? undefined,
            location: location.trim() || undefined,
            maxCapacity: capacity,
            status: status ?? undefined,
          });
        }}
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}
