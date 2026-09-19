import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Share } from 'react-native';
import { useAuth } from '../../../src/auth/AuthContext';
import { useFeedback } from '../../../src/components/Feedback';
import { useAsync } from '../../../src/hooks/useAsync';
import { ReferenceEntryScreen } from '../../../src/screens/ReferenceScreens';

export default function DirectoryEntryRoute() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const { api } = useAuth();
  const { notify } = useFeedback();
  const router = useRouter();
  const current = Number(number);
  const { data, loading, error } = useAsync(() => api.directoryEntry(current), [current]);
  const text = data ? `Diretório para a Catequese, n. ${data.number}${data.title ? ` — ${data.title}` : ''}\n\n${data.content}` : '';

  return (
    <ReferenceEntryScreen
      testID="directory-entry-screen"
      eyebrow={data ? `DIRETÓRIO · n. ${data.number}${data.part ? ` · Parte ${data.part}` : ''}` : undefined}
      title={data?.title || data?.chapter}
      body={data?.content}
      loading={loading}
      error={error}
      onPrev={current > 1 ? () => router.replace(`/(app)/directory/${current - 1}`) : undefined}
      onNext={() => router.replace(`/(app)/directory/${current + 1}`)}
      onShare={() => void Share.share({ message: text }).catch(() => undefined)}
      onCopy={async () => {
        await Clipboard.setStringAsync(text).catch(() => undefined);
        notify('Copiado.', 'success');
      }}
    />
  );
}
