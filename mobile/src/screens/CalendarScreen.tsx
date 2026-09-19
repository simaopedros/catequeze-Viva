import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { DateField, SelectField } from '../components/forms';
import { BrandButton, Card, EmptyState, ErrorText, Field, FilterChips, ListCard, ListRow, PrimaryFab, Screen, ScreenTitle, SectionHeader, SkeletonList, Tag, type IconName } from '../components/ui';
import { colors, spacing } from '../theme';
import { formatDate, formatDateTime } from '../utils/format';

export type CalendarItem = {
  id: string;
  name: string;
  description?: string | null;
  date: string;
  endDate?: string | null;
  type?: string;
  color?: string | null;
  kind: 'event' | 'meeting';
  classId?: string;
  className?: string;
  meetingId?: string;
};

const TYPE_META: Record<string, { label: string; icon: IconName; tone: 'gold' | 'info' | 'success' | 'neutral' | 'warning' }> = {
  liturgical: { label: 'Litúrgico', icon: 'cross-outline', tone: 'gold' },
  parish: { label: 'Paróquia', icon: 'church', tone: 'info' },
  class: { label: 'Turma', icon: 'school-outline', tone: 'success' },
  sacramental: { label: 'Sacramento', icon: 'water-outline', tone: 'warning' },
  diocese: { label: 'Diocese', icon: 'domain', tone: 'neutral' },
  meeting: { label: 'Encontro', icon: 'calendar-outline', tone: 'success' },
};

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function CalendarScreen({
  items,
  loading,
  error,
  onOpenMeeting,
  onCreate,
  refreshing,
  onRefresh,
}: {
  items: CalendarItem[];
  loading?: boolean;
  error?: string | null;
  onOpenMeeting?: (meetingId: string) => void;
  onCreate?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const [filter, setFilter] = useState<'upcoming' | 'all' | 'meetings' | 'events'>('upcoming');
  const grouped = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const filtered = items
      .filter((item) => (filter === 'meetings' ? item.kind === 'meeting' : filter === 'events' ? item.kind === 'event' : true))
      .filter((item) => (filter === 'upcoming' ? new Date(item.date).getTime() >= now.getTime() : true))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const map = new Map<string, CalendarItem[]>();
    for (const item of filtered) {
      const date = new Date(item.date);
      const key = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return Array.from(map.entries());
  }, [items, filter]);

  return (
    <Screen
      testID="calendar-screen"
      refreshing={refreshing}
      onRefresh={onRefresh}
      fab={onCreate ? <PrimaryFab icon="calendar-plus" label="Evento" onPress={onCreate} testID="create-event" /> : undefined}
    >
      <ScreenTitle title="Calendário" subtitle="Eventos litúrgicos, da paróquia e encontros das turmas." />
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'upcoming', label: 'Próximos', icon: 'calendar-clock-outline' },
          { value: 'meetings', label: 'Encontros', icon: 'school-outline' },
          { value: 'events', label: 'Eventos', icon: 'cross-outline' },
          { value: 'all', label: 'Tudo' },
        ]}
      />
      {loading && items.length === 0 ? <SkeletonList rows={4} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Calendário indisponível" body={error} /> : null}
      {!loading && !error && grouped.length === 0 ? <EmptyState icon="calendar-blank-outline" title="Sem eventos" body="Não há datas neste período." action={onCreate ? 'Criar evento' : undefined} onAction={onCreate} /> : null}
      {grouped.map(([month, list]) => (
        <View key={month}>
          <SectionHeader title={month.charAt(0).toUpperCase() + month.slice(1)} />
          <ListCard>
            {list.map((item, index) => {
              const meta = TYPE_META[item.kind === 'meeting' ? 'meeting' : String(item.type)] ?? TYPE_META.parish;
              const date = new Date(item.date);
              return (
                <ListRow
                  key={`${item.kind}-${item.id}`}
                  testID={`calendar-${item.kind}-${item.id}`}
                  left={
                    <View style={{ width: 44, alignItems: 'center', paddingVertical: 4, borderRadius: 10, backgroundColor: item.color || colors.paper }}>
                      <Text variant="labelSmall" style={{ color: item.color ? colors.white : colors.muted }}>
                        {date.toLocaleDateString('pt-PT', { weekday: 'short' }).replace('.', '')}
                      </Text>
                      <Text variant="titleMedium" style={{ color: item.color ? colors.white : colors.ink }}>
                        {date.getDate()}
                      </Text>
                    </View>
                  }
                  title={item.name}
                  subtitle={[item.className, item.kind === 'meeting' ? formatDateTime(item.date) : item.endDate ? `até ${formatDate(item.endDate)}` : null, item.description].filter(Boolean).join(' · ')}
                  right={<Tag label={meta.label} tone={meta.tone} icon={meta.icon} />}
                  chevron={item.kind === 'meeting'}
                  onPress={item.kind === 'meeting' && item.meetingId && onOpenMeeting ? () => onOpenMeeting(item.meetingId!) : undefined}
                  last={index === list.length - 1}
                />
              );
            })}
          </ListCard>
        </View>
      ))}
      <View style={{ height: spacing.lg }} />
    </Screen>
  );
}

export function CalendarEventFormScreen({
  busy,
  error,
  onSubmit,
}: {
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: { name: string; date: string; endDate?: string; description?: string; type?: string }) => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string | null>('parish');
  const [touched, setTouched] = useState(false);
  const nameError = touched && name.trim().length < 2 ? 'Indique o nome do evento.' : null;
  const dateError = touched && !date ? 'Escolha a data.' : null;

  return (
    <Screen testID="calendar-event-form">
      <ScreenTitle title="Novo evento" subtitle="Aparece no calendário de toda a paróquia." />
      <ErrorText message={error} />
      <Field label="Nome" icon="calendar-text-outline" value={name} onChangeText={setName} autoCapitalize="sentences" error={nameError} testID="event-name" />
      <DateField label="Data" value={date} onChange={setDate} error={dateError} allowClear={false} testID="event-date" />
      <DateField label="Data de fim (opcional)" value={endDate} onChange={setEndDate} icon="calendar-end" testID="event-end" />
      <SelectField
        label="Tipo"
        icon="tag-outline"
        value={type}
        onChange={setType}
        options={[
          { value: 'parish', label: 'Paróquia' },
          { value: 'liturgical', label: 'Litúrgico' },
          { value: 'sacramental', label: 'Sacramento' },
          { value: 'class', label: 'Turma' },
        ]}
        testID="event-type"
      />
      <Field label="Descrição (opcional)" icon="text" value={description} onChangeText={setDescription} multiline autoCapitalize="sentences" />
      <Card tone="paper">
        <Text variant="bodySmall" style={{ color: colors.muted }}>
          Eventos recorrentes e cores personalizadas podem ser definidos na plataforma web.
        </Text>
      </Card>
      <BrandButton
        testID="event-submit"
        icon="content-save-outline"
        label={busy ? 'A guardar…' : 'Criar evento'}
        loading={busy}
        disabled={busy}
        onPress={() => {
          setTouched(true);
          if (name.trim().length < 2 || !date) return;
          void onSubmit({ name: name.trim(), date: `${date}T12:00:00.000Z`, endDate: endDate ? `${endDate}T12:00:00.000Z` : undefined, description: description.trim() || undefined, type: type ?? undefined });
        }}
      />
    </Screen>
  );
}
