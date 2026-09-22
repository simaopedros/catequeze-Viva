import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useLayoutEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { colors } from '../../../src/theme';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { conversationSubtitle, conversationTitle } from '../../../src/messages/threadPresentation';
import { ThreadScreen } from '../../../src/screens/ThreadScreen';

export default function ThreadRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const navigation = useNavigation();
  const { data, loading, error, reload } = useAsync(() => api.conversation(String(id)), [id]);
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => {
    const title = data ? conversationTitle(data) : 'Conversa';
    const subtitle = data ? conversationSubtitle(data) : undefined;
    navigation.setOptions({
      headerBackTitle: 'Mensagens',
      headerTitle: () => (
        <View style={{ maxWidth: 260 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary }} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 12, color: colors.text.muted, marginTop: 1 }} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ),
    });
  }, [navigation, data]);

  return (
    <ThreadScreen
      data={data}
      loading={loading}
      error={error}
      busy={busy}
      onSend={async (content) => {
        setBusy(true);
        try {
          await api.sendMessage(String(id), content);
          await reload();
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
