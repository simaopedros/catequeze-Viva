import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BrandButton,
  EmptyState,
  ErrorState,
  Field,
  ListRow,
  LoadingState,
  PrimaryButton,
  Screen,
} from '../components/ui';
import { dateKey } from '../calendar/calendarMonth';
import { colors, radius, spacing, typography } from '../theme';

export type CalendarItem = {
  kind: 'meeting' | 'liturgy';
  id: string;
  title: string;
  date: string;
  meetingId?: string;
  classId?: string;
  className?: string | null;
  theme?: string | null;
  description?: string | null;
  clickable?: boolean;
  editable?: boolean;
};

type ClassOption = { id: string; name?: string };

type EventDraft = {
  kind: 'liturgy' | 'meeting';
  id?: string;
  name: string;
  theme: string;
  date: string;
  description: string;
  classId: string;
};

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function emptyDraft(dayIso: string, kind: 'liturgy' | 'meeting' = 'liturgy'): EventDraft {
  return {
    kind,
    name: '',
    theme: '',
    date: dayIso,
    description: '',
    classId: '',
  };
}

export function CalendarScreen({
  items,
  loading,
  error,
  canWriteEvents,
  month,
  onMonthChange,
  classes,
  busy,
  onOpenMeeting,
  onReload,
  onCreateLiturgicalEvent,
  onUpdateLiturgicalEvent,
  onDeleteLiturgicalEvent,
  onCreateMeeting,
  onUpdateMeeting,
  onDeleteMeeting,
}: {
  items: CalendarItem[];
  loading?: boolean;
  error?: string | null;
  canWriteEvents?: boolean;
  month: Date;
  onMonthChange: (month: Date) => void;
  classes: ClassOption[];
  busy?: boolean;
  onOpenMeeting: (meetingId: string) => void;
  onReload?: () => void;
  onCreateLiturgicalEvent: (draft: { name: string; date: string; description?: string }) => Promise<void>;
  onUpdateLiturgicalEvent: (
    id: string,
    draft: { name: string; date: string; description?: string },
  ) => Promise<void>;
  onDeleteLiturgicalEvent: (id: string) => Promise<void>;
  onCreateMeeting: (draft: {
    classId: string;
    title: string;
    theme?: string;
    date: string;
  }) => Promise<void>;
  onUpdateMeeting: (
    id: string,
    draft: { title: string; theme?: string; date: string },
  ) => Promise<void>;
  onDeleteMeeting: (id: string) => Promise<void>;
}) {
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<EventDraft>(() =>
    emptyDraft(dateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())),
  );

  const monthLabel = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const totalDays = daysInMonth(month);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const dayItems = useMemo(() => {
    return items.filter((item) => {
      const d = new Date(item.date);
      return d.getFullYear() === year && d.getMonth() === monthIndex && d.getDate() === selectedDay;
    });
  }, [items, year, monthIndex, selectedDay]);

  const openCreate = () => {
    const iso = dateKey(year, monthIndex, selectedDay);
    setDraft(emptyDraft(iso, 'liturgy'));
    setSheetOpen(true);
  };

  const openEdit = (item: CalendarItem) => {
    const d = new Date(item.date);
    const iso = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (item.kind === 'meeting') {
      setDraft({
        kind: 'meeting',
        id: item.id,
        name: item.title,
        theme: item.theme || '',
        date: iso,
        description: '',
        classId: item.classId || '',
      });
    } else {
      setDraft({
        kind: 'liturgy',
        id: item.id,
        name: item.title,
        theme: '',
        date: iso,
        description: item.description || '',
        classId: '',
      });
    }
    setSheetOpen(true);
  };

  const confirmDelete = (item: CalendarItem) => {
    Alert.alert('Remover evento', `Remover «${item.title}» da agenda?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            if (item.kind === 'meeting') {
              await onDeleteMeeting(item.id);
            } else {
              await onDeleteLiturgicalEvent(item.id);
            }
            onReload?.();
          } catch (err) {
            Alert.alert('Agenda', err instanceof Error ? err.message : 'Não foi possível remover.');
          }
        },
      },
    ]);
  };

  const handleItemPress = (item: CalendarItem) => {
    if (item.kind === 'meeting' && item.meetingId) {
      if (item.editable) {
        Alert.alert(item.title, item.className ? `Turma ${item.className}` : undefined, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir encontro', onPress: () => onOpenMeeting(item.meetingId!) },
          { text: 'Editar', onPress: () => openEdit(item) },
          { text: 'Excluir', style: 'destructive', onPress: () => confirmDelete(item) },
        ]);
      } else {
        onOpenMeeting(item.meetingId);
      }
      return;
    }
    if (item.kind === 'liturgy' && item.editable) {
      openEdit(item);
      return;
    }
  };

  const submitDraft = async () => {
    const title = draft.name.trim();
    if (title.length < 3) {
      Alert.alert('Agenda', 'Indique um título com pelo menos 3 caracteres.');
      return;
    }
    if (!draft.date.trim()) {
      Alert.alert('Agenda', 'Indique a data (AAAA-MM-DD).');
      return;
    }
    try {
      if (draft.kind === 'meeting') {
        if (!draft.classId && !draft.id) {
          Alert.alert('Agenda', 'Escolha a turma do encontro.');
          return;
        }
        if (draft.id) {
          await onUpdateMeeting(draft.id, {
            title,
            theme: draft.theme.trim() || undefined,
            date: draft.date.trim(),
          });
        } else {
          await onCreateMeeting({
            classId: draft.classId,
            title,
            theme: draft.theme.trim() || undefined,
            date: draft.date.trim(),
          });
        }
      } else if (draft.id) {
        await onUpdateLiturgicalEvent(draft.id, {
          name: title,
          date: draft.date.trim(),
          description: draft.description.trim() || undefined,
        });
      } else {
        await onCreateLiturgicalEvent({
          name: title,
          date: draft.date.trim(),
          description: draft.description.trim() || undefined,
        });
      }
      setSheetOpen(false);
      onReload?.();
    } catch (err) {
      Alert.alert('Agenda', err instanceof Error ? err.message : 'Não foi possível guardar.');
    }
  };

  return (
    <Screen testID="calendar-screen">
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Agenda indisponível" /> : null}

      {canWriteEvents ? (
        <PrimaryButton
          testID="calendar-create-event"
          label="Novo evento"
          onPress={openCreate}
          variant="primary"
        />
      ) : null}

      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          onPress={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
        >
          <Text style={styles.monthNav}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          onPress={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
        >
          <Text style={styles.monthNav}>›</Text>
        </Pressable>
      </View>

      <View style={styles.dayGrid}>
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
          const active = day === selectedDay;
          const hasItem = items.some((item) => {
            const d = new Date(item.date);
            return d.getFullYear() === year && d.getMonth() === monthIndex && d.getDate() === day;
          });
          return (
            <Pressable
              key={day}
              onPress={() => setSelectedDay(day)}
              style={[styles.dayCell, active && styles.dayCellActive]}
            >
              <Text style={[styles.dayText, active && styles.dayTextActive]}>{day}</Text>
              {hasItem ? <View style={styles.dayDot} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>
        {selectedDay} de {monthLabel}
        {dayItems.length > 0 ? ` · ${dayItems.length} evento${dayItems.length === 1 ? '' : 's'}` : ''}
      </Text>

      {dayItems.length === 0 ? (
        <EmptyState
          title="Nada marcado"
          body={canWriteEvents ? 'Toque em «Novo evento» para adicionar ao dia.' : 'Sem eventos neste dia.'}
        />
      ) : null}

      {dayItems.map((item) => (
        <ListRow
          key={`${item.kind}-${item.id}`}
          title={item.title}
          subtitle={
            item.kind === 'meeting'
              ? [item.className ? `Turma ${item.className}` : 'Encontro', item.theme].filter(Boolean).join(' · ')
              : 'Evento pastoral'
          }
          onPress={() => handleItemPress(item)}
        />
      ))}

      <Modal visible={sheetOpen} animationType="slide" transparent onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)} />
        <View style={styles.sheet} testID="calendar-event-sheet">
          <Text style={styles.sheetTitle}>{draft.id ? 'Editar evento' : 'Novo evento'}</Text>

          {!draft.id ? (
            <View style={styles.kindRow}>
              {(['liturgy', 'meeting'] as const).map((kind) => {
                const active = draft.kind === kind;
                return (
                  <Pressable
                    key={kind}
                    onPress={() => setDraft((prev) => ({ ...prev, kind }))}
                    style={[styles.kindChip, active && styles.kindChipActive]}
                  >
                    <Text style={[styles.kindChipText, active && styles.kindChipTextActive]}>
                      {kind === 'liturgy' ? 'Pastoral' : 'Encontro'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Field
            label={draft.kind === 'meeting' ? 'Título do encontro' : 'Nome do evento'}
            value={draft.name}
            onChangeText={(text) => setDraft((prev) => ({ ...prev, name: text }))}
            testID="calendar-event-title"
          />
          {draft.kind === 'meeting' ? (
            <Field
              label="Tema"
              value={draft.theme}
              onChangeText={(text) => setDraft((prev) => ({ ...prev, theme: text }))}
              placeholder="Opcional"
            />
          ) : (
            <Field
              label="Descrição"
              value={draft.description}
              onChangeText={(text) => setDraft((prev) => ({ ...prev, description: text }))}
              placeholder="Opcional"
            />
          )}
          <Field
            label="Data (AAAA-MM-DD)"
            value={draft.date}
            onChangeText={(text) => setDraft((prev) => ({ ...prev, date: text }))}
            testID="calendar-event-date"
          />

          {draft.kind === 'meeting' && !draft.id ? (
            <View style={styles.classPick}>
              <Text style={styles.classPickLabel}>Turma</Text>
              {classes.length === 0 ? (
                <Text style={styles.classPickEmpty}>Nenhuma turma disponível neste espaço.</Text>
              ) : (
                classes.map((row) => {
                  const active = draft.classId === row.id;
                  return (
                    <Pressable
                      key={row.id}
                      onPress={() => setDraft((prev) => ({ ...prev, classId: row.id }))}
                      style={[styles.classOption, active && styles.classOptionActive]}
                    >
                      <Text style={[styles.classOptionText, active && styles.classOptionTextActive]}>
                        {row.name || 'Turma'}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          ) : null}

          <BrandButton
            testID="calendar-event-save"
            label={busy ? 'A guardar…' : 'Guardar'}
            onPress={submitDraft}
            disabled={busy}
          />
          {draft.id && canWriteEvents ? (
            <PrimaryButton
              label="Excluir evento"
              variant="danger"
              onPress={() => {
                setSheetOpen(false);
                confirmDelete({
                  kind: draft.kind,
                  id: draft.id!,
                  title: draft.name,
                  date: draft.date,
                });
              }}
            />
          ) : null}
          <PrimaryButton label="Cancelar" variant="ghost" onPress={() => setSheetOpen(false)} />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[4],
    marginBottom: spacing[4],
  },
  monthNav: {
    fontSize: 22,
    color: colors.primary[800],
    paddingHorizontal: spacing[2],
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing[4],
  },
  dayCell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellActive: {
    backgroundColor: colors.primary[800],
  },
  dayText: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  dayTextActive: {
    color: colors.white,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent[500],
    marginTop: 2,
  },
  sectionLabel: {
    ...typography.bodySm,
    color: colors.text.muted,
    marginBottom: spacing[3],
    textTransform: 'capitalize',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing[4],
    paddingBottom: spacing[6],
    gap: spacing[2],
  },
  sheetTitle: {
    ...typography.headingSm,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  kindRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  kindChip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kindChipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[800],
  },
  kindChipText: {
    color: colors.text.muted,
    fontWeight: '600',
  },
  kindChipTextActive: {
    color: colors.primary[800],
  },
  classPick: {
    marginVertical: spacing[2],
  },
  classPickLabel: {
    ...typography.bodySm,
    color: colors.text.muted,
    marginBottom: spacing[2],
  },
  classPickEmpty: {
    color: colors.text.muted,
    fontSize: 14,
  },
  classOption: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing[2],
  },
  classOptionActive: {
    borderColor: colors.primary[800],
    backgroundColor: colors.primary[50],
  },
  classOptionText: {
    color: colors.text.primary,
  },
  classOptionTextActive: {
    fontWeight: '700',
    color: colors.primary[800],
  },
});
