import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Share } from 'react-native';
import { useAuth } from '../../../src/auth/AuthContext';
import { useFeedback } from '../../../src/components/Feedback';
import { useAsync } from '../../../src/hooks/useAsync';
import { ReferenceEntryScreen } from '../../../src/screens/ReferenceScreens';

export default function CatechismEntryRoute() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const { api } = useAuth();
  const { notify } = useFeedback();
  const router = useRouter();
  const current = Number(number);
  const { data, loading, error } = useAsync(() => api.catechismEntry(current), [current]);
  const text = data ? `§ ${data.number} — ${data.question}\n\n${data.answer}` : '';

  return (
    <ReferenceEntryScreen
      testID="catechism-entry-screen"
      eyebrow={data ? `CATECISMO · § ${data.number}` : undefined}
      title={data?.question}
      body={data?.answer}
      loading={loading}
      error={error}
      onPrev={current > 1 ? () => router.replace(`/(app)/catechism/${current - 1}`) : undefined}
      onNext={() => router.replace(`/(app)/catechism/${current + 1}`)}
      onShare={() => void Share.share({ message: text }).catch(() => undefined)}
      onCopy={async () => {
        await Clipboard.setStringAsync(text).catch(() => undefined);
        notify('Copiado.', 'success');
      }}
    />
  );
}
