import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { copy } from '../../../src/copy/ptBR';
import { FormScreen } from '../../../src/screens/CatalogListScreen';

export default function NewAnnouncementRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <FormScreen
      title={copy.announcements.title}
      busy={busy}
      error={error}
      fields={[
        { key: 'title', label: copy.calendar.eventName, value: title, onChange: setTitle },
        { key: 'body', label: copy.groups.notice, value: body, onChange: setBody, multiline: true },
      ]}
      onSubmit={async () => {
        setBusy(true);
        setError(null);
        try {
          await api.createAnnouncement({ title, body, workspaceId: workspaceId || undefined });
          router.back();
        } catch (err) {
          setError(err instanceof Error ? err.message : copy.catalog.error);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
