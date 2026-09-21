import React, { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { ClassMeetingPreviewRow, formatClassMeetingWhen } from '../components/classDetailUi';
import {
  BrandButton,
  EmptyState,
  Field,
  LoadingState,
  PrimaryButton,
  Screen,
  ScreenTitle,
} from '../components/ui';
import { asMeetingList, meetingWhen, type MeetingListItem } from '../meetings/meetingUtils';
import { colors, spacing } from '../theme';

export function ClassMeetingsScreen({
  className,
  meetingsPayload,
  loading,
  error,
  creating,
  onOpenMeeting,
  onOpenAttendance,
  onCreateMeeting,
  onReload,
}: {
  className?: string;
  meetingsPayload: unknown;
  loading?: boolean;
  error?: string | null;
  creating?: boolean;
  onOpenMeeting: (meetingId: string) => void;
  onOpenAttendance: (meetingId: string) => void;
  onCreateMeeting: (draft: { title: string; theme: string; date: string }) => Promise<void>;
  onReload?: () => void;
}) {
  const meetings = useMemo(() => asMeetingList(meetingsPayload), [meetingsPayload]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const submit = async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      Alert.alert('Encontro', 'Indique um título com pelo menos 3 caracteres.');
      return;
    }
    if (!date.trim()) {
      Alert.alert('Encontro', 'Indique a data do encontro.');
      return;
    }
    try {
      await onCreateMeeting({ title: trimmedTitle, theme: theme.trim(), date: date.trim() });
      setTitle('');
      setTheme('');
      setShowForm(false);
      onReload?.();
    } catch (err) {
      Alert.alert('Encontro', err instanceof Error ? err.message : 'Não foi possível criar o encontro.');
    }
  };

  return (
    <Screen testID="class-meetings-screen" variant="form">
      <ScreenTitle
        title="Encontros"
        subtitle={className ? `Turma ${className}` : 'Agende sessões e abra a chamada de presença.'}
      />

      <PrimaryButton
        testID="create-meeting-toggle"
        label={showForm ? 'Cancelar novo encontro' : 'Criar encontro'}
        onPress={() => setShowForm((value) => !value)}
        variant={showForm ? 'ghost' : 'primary'}
      />

      {showForm ? (
        <View testID="create-meeting-form" style={{ marginTop: spacing[4], marginBottom: spacing[4] }}>
          <Field label="Título" value={title} onChangeText={setTitle} placeholder="Ex.: Encontro 12" testID="meeting-title" />
          <Field label="Tema" value={theme} onChangeText={setTheme} placeholder="Ex.: Os dons do Espírito Santo" />
          <Field label="Data (AAAA-MM-DD)" value={date} onChangeText={setDate} testID="meeting-date" />
          <BrandButton
            testID="create-meeting-submit"
            label={creating ? 'A guardar…' : 'Guardar encontro'}
            onPress={submit}
            disabled={creating}
          />
        </View>
      ) : null}

      <Text style={{ color: colors.text.muted, fontSize: 13, marginBottom: spacing[3] }}>
        Toque num encontro para ver detalhes. Use «Fazer chamada» para registar presenças.
      </Text>

      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Encontros indisponíveis" body={error} /> : null}

      {!loading && meetings.length === 0 ? (
        <EmptyState
          title="Ainda não há encontros"
          body="Crie o primeiro encontro para começar a marcar presenças nesta turma."
        />
      ) : (
        meetings.map((meeting: MeetingListItem) => (
          <View key={meeting.id} style={{ marginBottom: spacing[2] }}>
            <ClassMeetingPreviewRow
              whenLabel={formatClassMeetingWhen(meetingWhen(meeting))}
              theme={meeting.theme || meeting.title}
              onPress={() => onOpenMeeting(meeting.id)}
            />
            <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[1], marginLeft: spacing[1] }}>
              <BrandButton
                label="Detalhes"
                variant="ghost"
                onPress={() => onOpenMeeting(meeting.id)}
              />
              <BrandButton
                testID={`meeting-attendance-${meeting.id}`}
                label="Fazer chamada"
                onPress={() => onOpenAttendance(meeting.id)}
              />
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}
