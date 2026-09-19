import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useFeedback } from '../../../../src/components/Feedback';
import { useAsync } from '../../../../src/hooks/useAsync';
import { AttendanceScreen } from '../../../../src/screens/AttendanceScreen';

export default function AttendanceRoute() {
  const { id, classId: classIdParam } = useLocalSearchParams<{ id: string; classId?: string }>();
  const { api } = useAuth();
  const { notify } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const sheet = useAsync(async () => {
    let classId = classIdParam;
    if (!classId) {
      const meeting = await api.meetingDetails(String(id));
      classId = meeting?.class?.id || meeting?.classId;
    }
    if (!classId) throw new Error('Não foi possível identificar a turma deste encontro.');
    const result = await api.meetingSheet(String(id), String(classId));
    return { ...result.meeting, participants: result.participants, summary: result.summary, classId };
  }, [id, classIdParam]);

  async function save(changes: { catechumenProfileId: string; status: string }[]) {
    setBusy(true);
    setSaveError(null);
    try {
      const result = await api.saveAttendanceBatch(String(id), changes);
      const rejected = (result?.results ?? []).filter((item: any) => item.outcome && item.outcome !== 'applied');
      notify(rejected.length ? `${changes.length - rejected.length} gravado(s), ${rejected.length} com conflito.` : 'Presenças gravadas.', rejected.length ? 'info' : 'success');
      await sheet.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível gravar.';
      setSaveError(message);
      notify(message, 'error');
      throw err;
    } finally {
      setBusy(false);
    }
  }

  return (
    <AttendanceScreen
      meeting={sheet.data}
      loading={sheet.loading}
      error={sheet.error}
      busy={busy}
      saveError={saveError}
      onSave={(catechumenProfileId, status) => save([{ catechumenProfileId, status }])}
      onSaveAll={(entries) => save(entries)}
    />
  );
}
