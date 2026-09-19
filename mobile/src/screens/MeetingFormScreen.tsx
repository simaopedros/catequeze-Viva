import React, { useEffect, useState } from 'react';
import type { MeetingInput } from '../api/client';
import { DateField, TimeField } from '../components/forms';
import { BrandButton, ErrorText, Field, Row, Screen, ScreenTitle } from '../components/ui';
import { spacing } from '../theme';

function splitIso(value?: string | null): { date: string | null; time: string | null } {
  if (!value) return { date: null, time: null };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: value.slice(0, 10) || null, time: null };
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return { date: local.toISOString().slice(0, 10), time: local.toISOString().slice(11, 16) };
}

function joinIso(date: string, time: string | null): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = (time || '10:00').split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

export function MeetingFormScreen({
  initial,
  className,
  busy,
  error,
  onSubmit,
  mode,
}: {
  initial?: Partial<MeetingInput> | null;
  className?: string | null;
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: MeetingInput) => Promise<void> | void;
  mode: 'create' | 'edit';
}) {
  const start = splitIso(initial?.date);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [theme, setTheme] = useState(initial?.theme ?? '');
  const [date, setDate] = useState<string | null>(start.date);
  const [time, setTime] = useState<string | null>(start.time);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!initial) return;
    const next = splitIso(initial.date);
    setTitle(initial.title ?? '');
    setTheme(initial.theme ?? '');
    setDate(next.date);
    setTime(next.time);
    setNotes(initial.notes ?? '');
  }, [initial]);

  const titleError = touched && title.trim().length < 3 ? 'Indique um título com pelo menos 3 caracteres.' : null;
  const dateError = touched && !date ? 'Escolha a data do encontro.' : null;

  return (
    <Screen testID="meeting-form-screen">
      <ScreenTitle eyebrow={className ?? undefined} title={mode === 'create' ? 'Novo encontro' : 'Editar encontro'} subtitle="Título, tema, data e notas para os catequistas." />
      <ErrorText message={error} />
      <Field label="Título" icon="format-title" value={title} onChangeText={setTitle} autoCapitalize="sentences" error={titleError} testID="meeting-title" />
      <Field label="Tema (opcional)" icon="lightbulb-on-outline" value={theme} onChangeText={setTheme} autoCapitalize="sentences" testID="meeting-theme" />
      <DateField label="Data" value={date} onChange={setDate} error={dateError} allowClear={false} testID="meeting-date" />
      <Row style={{ alignItems: 'flex-start' }}>
        <TimeField label="Hora" value={time} onChange={setTime} testID="meeting-time" />
      </Row>
      <Field label="Notas (opcional)" icon="note-text-outline" value={notes} onChangeText={setNotes} multiline numberOfLines={4} autoCapitalize="sentences" testID="meeting-notes" />
      <BrandButton
        testID="meeting-submit"
        icon="content-save-outline"
        label={busy ? 'A guardar…' : mode === 'create' ? 'Criar encontro' : 'Guardar alterações'}
        loading={busy}
        disabled={busy}
        onPress={() => {
          setTouched(true);
          if (title.trim().length < 3 || !date) return;
          void onSubmit({
            title: title.trim(),
            theme: theme.trim() || undefined,
            date: joinIso(date, time),
            notes: notes.trim() || undefined,
          });
        }}
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}
