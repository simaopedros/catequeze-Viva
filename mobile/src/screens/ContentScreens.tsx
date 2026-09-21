import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  Card,
  EmptyState,
  ErrorState,
  FilterChip,
  ListRow,
  LoadingState,
  PrimaryButton,
  Screen,
  ScreenTitle,
  SearchInput,
} from '../components/ui';
import { colors, spacing } from '../theme';

const CATECHISM_PARTS = [
  { key: 'CREDO', title: 'O Credo' },
  { key: 'SACRAMENTOS', title: 'Os Sacramentos' },
  { key: 'MANDAMENTOS', title: 'Os Mandamentos' },
  { key: 'ORACAO', title: 'A Oração' },
  { key: 'VIRTUDES', title: 'As Virtudes' },
  { key: 'PECADO', title: 'O Pecado' },
];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function CalendarScreen({
  items,
  loading,
  error,
  onOpenMeeting,
}: {
  items: any[];
  loading?: boolean;
  error?: string | null;
  onOpenMeeting: (meetingId: string) => void;
}) {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const monthLabel = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const totalDays = daysInMonth(month);
  const dayItems = useMemo(() => {
    return items.filter((item) => {
      const d = new Date(item.date);
      return (
        d.getFullYear() === month.getFullYear() &&
        d.getMonth() === month.getMonth() &&
        d.getDate() === selectedDay
      );
    });
  }, [items, month, selectedDay]);

  return (
    <Screen testID="calendar-screen">
      <ScreenTitle title="Agenda" subtitle="Encontros da turma e o calendário litúrgico." />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Agenda indisponível" /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] }}>
        <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          <Text style={{ fontSize: 22, color: colors.primary[800] }}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary, textTransform: 'capitalize' }}>{monthLabel}</Text>
        <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          <Text style={{ fontSize: 22, color: colors.primary[800] }}>›</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing[4] }}>
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
          const active = day === selectedDay;
          const hasItem = items.some((item) => {
            const d = new Date(item.date);
            return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth() && d.getDate() === day;
          });
          return (
            <Pressable
              key={day}
              onPress={() => setSelectedDay(day)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? colors.primary[800] : 'transparent',
              }}
            >
              <Text style={{ color: active ? colors.white : colors.text.primary, fontWeight: '600' }}>{day}</Text>
              {hasItem ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent[500], marginTop: 2 }} /> : null}
            </Pressable>
          );
        })}
      </View>
      {dayItems.length === 0 ? <EmptyState title="Dia livre" /> : null}
      {dayItems.map((item) => (
        <ListRow
          key={`${item.kind}-${item.id}`}
          title={item.title}
          subtitle={item.kind === 'meeting' ? 'Encontro' : 'Liturgia'}
          onPress={item.clickable && item.meetingId ? () => onOpenMeeting(item.meetingId) : undefined}
        />
      ))}
    </Screen>
  );
}

export function AnnouncementsScreen({
  rows,
  loading,
  error,
  onOpen,
}: {
  rows: any[];
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <Screen>
      <ScreenTitle title="Comunicados" subtitle="Avisos da paróquia." />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Comunicados indisponíveis" /> : null}
      {!loading && !error && rows.length === 0 ? <EmptyState title="Nenhum comunicado" /> : null}
      {rows.map((row) => (
        <Card key={row.id}>
          <Pressable onPress={() => onOpen(row.id)}>
            <Text style={{ fontWeight: '700', fontSize: 17, color: colors.text.primary }}>{row.title}</Text>
            <Text style={{ color: colors.text.muted, marginTop: 4 }} numberOfLines={2}>{row.bodyPreview}</Text>
            <Text style={{ marginTop: 8, fontSize: 13, color: row.acknowledged ? colors.success : colors.accent[700] }}>
              {row.acknowledged ? 'Leitura confirmada' : 'Aguardando confirmação'}
            </Text>
          </Pressable>
        </Card>
      ))}
    </Screen>
  );
}

export function AnnouncementDetailScreen({
  item,
  loading,
  error,
  onAcknowledge,
  busy,
}: {
  item: any;
  loading?: boolean;
  error?: string | null;
  onAcknowledge: () => void;
  busy?: boolean;
}) {
  if (loading) return <Screen><LoadingState /></Screen>;
  if (error || !item) return <Screen><ErrorState title="Comunicados indisponíveis" /></Screen>;

  return (
    <Screen>
      <ScreenTitle title={item.title} />
      <Text style={{ fontSize: 16, lineHeight: 24, color: colors.text.secondary }}>{item.body}</Text>
      {item.requireAck && !item.acknowledged ? (
        <PrimaryButton label={busy ? 'Confirmando…' : 'Confirmar leitura'} onPress={onAcknowledge} loading={busy} variant="accent" />
      ) : (
        <Text style={{ marginTop: spacing[4], color: colors.success, fontWeight: '600' }}>Leitura confirmada</Text>
      )}
    </Screen>
  );
}

export function JourneysScreen({
  rows,
  loading,
  error,
  onOpen,
}: {
  rows: any[];
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <Screen>
      <ScreenTitle title="Jornadas" subtitle="Marcos sacramentais." />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Jornadas indisponíveis" /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="Sem jornadas. Quando uma jornada for aberta na web, ela aparece aqui." />
      ) : null}
      {rows.map((row) => (
        <ListRow
          key={row.id}
          title={row.catechumenName || 'Catequizando'}
          subtitle={row.templateName || 'Jornada sacramental'}
          onPress={() => onOpen(row.id)}
        />
      ))}
    </Screen>
  );
}

export function JourneyDetailScreen({
  journey,
  loading,
  error,
  onToggleMilestone,
  busyId,
}: {
  journey: any;
  loading?: boolean;
  error?: string | null;
  onToggleMilestone: (milestoneId: string, completed: boolean) => void;
  busyId?: string | null;
}) {
  if (loading) return <Screen><LoadingState /></Screen>;
  if (error || !journey) return <Screen><ErrorState title="Jornada indisponível" /></Screen>;

  const name = [journey.catechumenProfile?.firstName, journey.catechumenProfile?.lastName].filter(Boolean).join(' ');

  return (
    <Screen>
      <ScreenTitle title={name || 'Jornada'} subtitle={journey.template?.name} />
      {(journey.milestones || []).map((milestone: any) => {
        const completed = milestone.status === 'COMPLETED';
        return (
          <Card key={milestone.id}>
            <Text style={{ fontWeight: '700', color: colors.text.primary }}>{milestone.templateMilestone?.name || milestone.name}</Text>
            <Text style={{ color: colors.text.muted, marginVertical: 4 }}>{completed ? 'Concluído' : 'Pendente'}</Text>
            <PrimaryButton
              label={completed ? 'Marcar como pendente' : 'Marcar como concluído'}
              variant="secondary"
              loading={busyId === milestone.id}
              disabled={busyId === milestone.id}
              onPress={() => onToggleMilestone(milestone.id, !completed)}
            />
          </Card>
        );
      })}
    </Screen>
  );
}

export function CatechismHomeScreen({
  onOpenCategory,
  onSearch,
  results,
  searching,
}: {
  onOpenCategory: (key: string) => void;
  onSearch: (q: string) => void;
  results: any[];
  searching?: boolean;
}) {
  const [query, setQuery] = useState('');

  return (
    <Screen testID="catechism-screen">
      <ScreenTitle title="Catecismo" subtitle="Seis partes da fé." />
      <SearchInput placeholder="Buscar no catecismo" value={query} onChangeText={setQuery} />
      <PrimaryButton label="Buscar" variant="secondary" onPress={() => onSearch(query)} loading={searching} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginTop: spacing[4] }}>
        {CATECHISM_PARTS.map((part) => (
          <Pressable key={part.key} onPress={() => onOpenCategory(part.key)} style={{ width: '47%' }}>
            <Card>
              <Text style={{ fontWeight: '700', fontSize: 15, color: colors.text.primary }}>{part.title}</Text>
            </Card>
          </Pressable>
        ))}
      </View>
      {results.length > 0 ? (
        results.map((entry) => (
          <ListRow key={entry.number ?? entry.id} title={`${entry.number}. ${entry.question || entry.title}`} />
        ))
      ) : (
        <EmptyState title="Escolha um caminho" />
      )}
    </Screen>
  );
}

export function CatechismEntryScreen({ entry, loading, error }: { entry: any; loading?: boolean; error?: string | null }) {
  if (loading) return <Screen><LoadingState /></Screen>;
  if (error || !entry) return <Screen><ErrorState title="Busca indisponível" /></Screen>;

  return (
    <Screen>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.muted }}>Número {entry.number}</Text>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary, marginVertical: spacing[3] }}>{entry.question}</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: colors.text.secondary }}>{entry.answer}</Text>
    </Screen>
  );
}
