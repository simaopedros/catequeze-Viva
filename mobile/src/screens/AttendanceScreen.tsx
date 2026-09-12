import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import {
  BrandButton,
  EmptyState,
  LoadingState,
  PersonRow,
  Screen,
  ScreenTitle,
  SegmentedControl,
  StatusPill,
} from '../components/ui';
import { formatDate, personName, statusLabel } from '../lib/payload';
import { attendanceTone, colors, fonts, spacing, type AttendanceStatusId } from '../theme';

const STATUSES = Object.keys(attendanceTone) as AttendanceStatusId[];

function asStatus(value?: string | null): AttendanceStatusId | null {
  if (!value) return null;
  return (STATUSES as string[]).includes(value) ? (value as AttendanceStatusId) : null;
}

export function AttendanceScreen({
  meeting,
  loading,
  error,
  onSave,
  onSelectMeeting,
  busy,
}: {
  meeting: any;
  loading?: boolean;
  error?: string | null;
  onSave: (catechumenProfileId: string, status: string) => Promise<void> | void;
  onSelectMeeting?: (id: string) => void;
  busy?: boolean;
}) {
  const rows = useMemo(() => {
    return (
      meeting?.participants ||
      meeting?.attendance ||
      meeting?.records ||
      meeting?.enrollments ||
      meeting?.catechumens ||
      []
    );
  }, [meeting]);
  const [draft, setDraft] = useState<Record<string, AttendanceStatusId>>({});
  const summary = meeting?.summary;
  const siblings = meeting?.siblingMeetings || [];
  const currentMeetingId = meeting?.meeting?.id;

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const saveDrafts = async () => {
    const entries = Object.entries(draft);
    for (const [id, status] of entries) {
      await onSave(id, status);
    }
  };

  return (
    <Screen
      testID="attendance-screen"
      footer={
        rows.length > 0 ? (
          <BrandButton
            label={busy ? 'Salvando…' : 'Salvar'}
            disabled={busy || Object.keys(draft).length === 0}
            onPress={saveDrafts}
          />
        ) : null
      }
    >
      <ScreenTitle
        title="Chamada"
        subtitle={meeting?.meeting?.title || meeting?.title || 'Toque no estado. A forma também conta, não só a cor.'}
      />
      {error ? <EmptyState title="Não foi possível carregar" body={error} /> : null}
      {siblings.length > 1 ? (
        <View style={{ marginBottom: spacing.sm }}>
          <Text style={{ color: colors.ink, fontFamily: fonts.sansSemi, marginBottom: 8 }}>Encontros desta turma</Text>
          <SegmentedControl
            testID="sibling-meetings"
            value={String(currentMeetingId || siblings[0]?.id || '')}
            onChange={(id) => id !== currentMeetingId && onSelectMeeting?.(id)}
            options={siblings.map((item: any) => ({
              id: item.id,
              label: item.title || item.theme || 'Encontro',
            }))}
          />
          {siblings.map((item: any) => (
            <PersonRow
              key={item.id}
              testID={`sibling-meeting-${item.id}`}
              name={item.title || item.theme || 'Encontro'}
              hint={[formatDate(item.date), item.status ? statusLabel(item.status) : ''].filter(Boolean).join(' · ')}
              chip={item.id === currentMeetingId ? 'Actual' : undefined}
              onPress={() => item.id !== currentMeetingId && onSelectMeeting?.(item.id)}
            />
          ))}
        </View>
      ) : null}
      {summary ? (
        <Text style={{ color: colors.muted, fontFamily: fonts.sans, marginBottom: spacing.md }}>
          {summary.registered ?? 0} de {summary.total ?? rows.length} preenchidos
          {' · '}
          {summary.present ?? 0} presentes · {summary.absent ?? 0} ausentes · {summary.late ?? 0} atrasados ·{' '}
          {summary.justified ?? 0} justificados
        </Text>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState title="Sem lista" body="Este encontro ainda não tem catequizandos para marcar." />
      ) : (
        rows.map((row: any) => {
          const id = row.catechumenProfileId || row.catechumenProfile?.id || row.id;
          const profile = row.catechumenProfile || row;
          const name = personName(profile, 'Catequizando');
          const status = draft[id] || asStatus(row.status);
          return (
            <View key={id} style={{ marginBottom: spacing.md }}>
              <PersonRow
                name={name}
                photoUrl={profile.photoUrl || profile.avatarUrl}
                hint={status ? statusLabel(status) : 'Não preenchido'}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 8 }}>
                {STATUSES.map((item) => (
                  <StatusPill
                    key={item}
                    status={item}
                    selected={status === item}
                    onPress={() => setDraft((current) => ({ ...current, [id]: item }))}
                  />
                ))}
              </View>
            </View>
          );
        })
      )}
    </Screen>
  );
}
