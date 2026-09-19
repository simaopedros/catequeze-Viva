import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Avatar } from '../components/Avatar';
import { BrandButton, Card, EmptyState, ErrorText, Icon, ListCard, Row, Screen, ScreenTitle, SkeletonList, type IconName } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { formatDateTime, fullName } from '../utils/format';

export const ATTENDANCE_STATUSES = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_META: Record<AttendanceStatus, { label: string; short: string; icon: IconName; color: string; bg: string }> = {
  PRESENT: { label: 'Presente', short: 'P', icon: 'check', color: colors.success, bg: '#E3F3EA' },
  LATE: { label: 'Atrasado', short: 'A', icon: 'clock-outline', color: colors.warning, bg: '#FBEFD6' },
  ABSENT: { label: 'Falta', short: 'F', icon: 'close', color: colors.danger, bg: '#FDE7E4' },
  EXCUSED: { label: 'Justificada', short: 'J', icon: 'file-check-outline', color: colors.midnight, bg: '#DDE6F2' },
};

export function statusLabel(status: string): string {
  return ATTENDANCE_META[status as AttendanceStatus]?.label ?? status;
}

function rowsOf(meeting: any): any[] {
  return meeting?.attendance || meeting?.records || meeting?.enrollments || meeting?.catechumens || [];
}

function StatusPicker({ value, onChange, disabled }: { value: AttendanceStatus | null; onChange: (status: AttendanceStatus) => void; disabled?: boolean }) {
  return (
    <Row gap={6}>
      {ATTENDANCE_STATUSES.map((status) => {
        const meta = ATTENDANCE_META[status];
        const active = value === status;
        return (
          <Pressable
            key={status}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={meta.label}
            testID={`status-${status}`}
            onPress={() => onChange(status)}
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? meta.color : meta.bg,
              borderWidth: active ? 0 : 1,
              borderColor: colors.line,
              opacity: disabled ? 0.6 : 1,
            }}
          >
            <Icon name={meta.icon} size={20} color={active ? colors.white : meta.color} />
          </Pressable>
        );
      })}
    </Row>
  );
}

export function AttendanceScreen({
  meeting,
  loading,
  error,
  onSave,
  onSaveAll,
  busy,
  saveError,
}: {
  meeting: any;
  loading?: boolean;
  error?: string | null;
  onSave: (catechumenProfileId: string, status: string) => Promise<void> | void;
  onSaveAll?: (entries: { catechumenProfileId: string; status: string }[]) => Promise<void> | void;
  busy?: boolean;
  saveError?: string | null;
}) {
  const rows = useMemo(() => rowsOf(meeting), [meeting]);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [savedIds, setSavedIds] = useState<Record<string, true>>({});

  const idOf = (row: any) => row.catechumenProfileId || row.catechumenProfile?.id || row.id;
  const currentOf = (row: any): AttendanceStatus | null => (draft[idOf(row)] ?? (row.status as AttendanceStatus | undefined) ?? null);

  const counts = useMemo(() => {
    const result: Record<AttendanceStatus, number> = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
    for (const row of rows) {
      const status = currentOf(row);
      if (status && status in result) result[status] += 1;
    }
    return result;
  }, [rows, draft]);

  const dirty = Object.keys(draft).length;

  async function saveOne(row: any) {
    const id = idOf(row);
    const status = currentOf(row) || 'PRESENT';
    await onSave(id, status);
    setSavedIds((current) => ({ ...current, [id]: true }));
    setDraft((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function saveAll() {
    const entries = rows
      .map((row) => ({ catechumenProfileId: idOf(row), status: currentOf(row) || 'PRESENT' }))
      .filter((entry) => draft[entry.catechumenProfileId] !== undefined);
    if (onSaveAll) {
      await onSaveAll(entries);
    } else {
      for (const entry of entries) await onSave(entry.catechumenProfileId, entry.status);
    }
    setSavedIds((current) => ({ ...current, ...Object.fromEntries(entries.map((entry) => [entry.catechumenProfileId, true])) }));
    setDraft({});
  }

  function markAll(status: AttendanceStatus) {
    setDraft(Object.fromEntries(rows.map((row) => [idOf(row), status])));
  }

  if (loading && !meeting) {
    return (
      <Screen>
        <SkeletonList rows={4} />
      </Screen>
    );
  }

  return (
    <Screen testID="attendance-screen">
      <ScreenTitle
        eyebrow={meeting?.class?.name}
        title={meeting?.title || meeting?.theme || 'Presença'}
        subtitle={formatDateTime(meeting?.startsAt || meeting?.date) || 'Toque no estado de cada catequizando e grave.'}
      />
      {error ? <EmptyState icon="cloud-off-outline" title="Não foi possível carregar" body={error} /> : null}
      <ErrorText message={saveError} />
      {rows.length === 0 && !error ? (
        <EmptyState icon="account-multiple-outline" title="Sem lista" body="Este encontro ainda não tem catequizandos para marcar." />
      ) : null}
      {rows.length > 0 ? (
        <>
          <Card tone="paper">
            <Row style={{ justifyContent: 'space-between' }}>
              {ATTENDANCE_STATUSES.map((status) => {
                const meta = ATTENDANCE_META[status];
                return (
                  <View key={status} style={{ alignItems: 'center', flex: 1 }}>
                    <Text variant="titleMedium" style={{ color: meta.color }}>
                      {counts[status]}
                    </Text>
                    <Text variant="labelSmall" style={{ color: colors.muted }}>
                      {meta.label}
                    </Text>
                  </View>
                );
              })}
            </Row>
            <Row style={{ marginTop: spacing.sm }}>
              <BrandButton variant="tonal" icon="check-all" label="Todos presentes" onPress={() => markAll('PRESENT')} style={{ flex: 1 }} disabled={busy} />
              <BrandButton variant="ghost" icon="close-box-multiple-outline" label="Todos falta" onPress={() => markAll('ABSENT')} style={{ flex: 1 }} disabled={busy} />
            </Row>
          </Card>
          <ListCard>
            {rows.map((row: any, index: number) => {
              const id = idOf(row);
              const profile = row.catechumenProfile || row;
              const name = row.displayName || row.name || fullName(profile, 'Catequizando');
              const status = currentOf(row);
              const isDirty = draft[id] !== undefined;
              return (
                <View key={id} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: index === rows.length - 1 ? 0 : 1, borderBottomColor: colors.line, gap: spacing.sm }}>
                  <Row>
                    <Avatar name={name} url={profile?.avatarUrl} size={34} />
                    <View style={{ flex: 1 }}>
                      <Text variant="titleSmall" style={{ color: colors.ink }}>
                        {name}
                      </Text>
                      <Text variant="labelSmall" style={{ color: status ? ATTENDANCE_META[status].color : colors.muted }}>
                        {status ? statusLabel(status) : 'Por marcar'}
                        {savedIds[id] && !isDirty ? ' · guardado' : isDirty ? ' · por gravar' : ''}
                      </Text>
                    </View>
                    {isDirty && !onSaveAll ? (
                      <BrandButton variant="text" label="Gravar" disabled={busy} onPress={() => void saveOne(row)} style={{ marginTop: 0 }} testID={`save-${id}`} />
                    ) : null}
                  </Row>
                  <StatusPicker value={status} disabled={busy} onChange={(next) => setDraft((current) => ({ ...current, [id]: next }))} />
                </View>
              );
            })}
          </ListCard>
          <BrandButton
            icon="content-save-outline"
            label={busy ? 'A gravar…' : dirty > 0 ? `Gravar ${dirty} ${dirty === 1 ? 'alteração' : 'alterações'}` : 'Tudo gravado'}
            loading={busy}
            disabled={busy || dirty === 0}
            onPress={() => void saveAll()}
            testID="save-all"
          />
        </>
      ) : null}
    </Screen>
  );
}
