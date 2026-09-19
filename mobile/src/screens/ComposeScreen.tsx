import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BrandButton, ErrorText, Field, Screen, ScreenTitle } from '../components/ui';
import { ShareCard } from '../components/PostCard';
import type { SocialShare, SocialTopic } from '../api/types';
import { colors, spacing } from '../theme';

export function ComposeScreen({
  canPublish,
  accessLoading,
  onPublish,
  onPreviewShare,
  preview,
  busy,
  error,
  initialKind,
  initialSourceId,
  topics,
  selectedTopics,
  onToggleTopic,
}: {
  canPublish: boolean;
  accessLoading?: boolean;
  onPublish: (
    body: string,
    share?: { kind: string; sourceId: string } | null,
    topicSlugs?: string[],
  ) => Promise<void> | void;
  onPreviewShare?: (kind: string, sourceId: string) => Promise<void> | void;
  preview?: SocialShare | null;
  busy?: boolean;
  error?: string | null;
  initialKind?: string;
  initialSourceId?: string;
  topics?: SocialTopic[];
  selectedTopics?: string[];
  onToggleTopic?: (slug: string) => void;
}) {
  const [body, setBody] = useState('');
  const [kind, setKind] = useState(initialKind || 'VERSE');
  const [sourceId, setSourceId] = useState(initialSourceId || '');

  return (
    <Screen testID="compose-screen">
      <ScreenTitle
        title="Nova publicação"
        subtitle={
          accessLoading
            ? 'A verificar se a sua conta pode publicar…'
            : canPublish
              ? 'Partilhe um momento ou um versículo com a Comunidade.'
              : 'A publicação exige assinatura.'
        }
      />
      <ErrorText message={error} />
      {preview ? (
        <View style={{ marginBottom: spacing.md }}>
          <ShareCard kind={preview.kind} title={preview.title} subtitle={preview.subtitle} excerpt={preview.excerpt} />
        </View>
      ) : null}
      <Field label="Texto" value={body} onChangeText={setBody} multiline testID="compose-body" />
      {topics && topics.length > 0 && onToggleTopic ? (
        <View style={{ marginBottom: spacing.md }}>
          <Text style={{ color: colors.ink, fontWeight: '600', marginBottom: 6 }}>Tópicos</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {topics.map((topic) => {
              const active = (selectedTopics ?? []).includes(topic.slug);
              return (
                <Pressable
                  key={topic.slug}
                  testID={`compose-topic-${topic.slug}`}
                  onPress={() => onToggleTopic(topic.slug)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 999,
                    backgroundColor: active ? colors.ink : colors.paper,
                    borderWidth: 1,
                    borderColor: colors.line,
                  }}
                >
                  <Text style={{ color: active ? colors.white : colors.ink, fontWeight: '700', fontSize: 13 }}>
                    {topic.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {!initialSourceId ? (
        <>
          <Field label="Tipo de partilha (opcional)" value={kind} onChangeText={setKind} />
          <Field
            label="ID da fonte (ex. bookId:chapter:verse)"
            value={sourceId}
            onChangeText={setSourceId}
            testID="compose-share-id"
          />
          {onPreviewShare ? (
            <BrandButton
              variant="ghost"
              label="Pré-visualizar partilha"
              onPress={() => sourceId && onPreviewShare(kind, sourceId)}
            />
          ) : null}
        </>
      ) : null}
      <BrandButton
        testID="compose-submit"
        label={busy ? 'A publicar…' : 'Publicar'}
        disabled={(!canPublish && !accessLoading) || busy || !body.trim()}
        onPress={() => onPublish(body.trim(), sourceId ? { kind, sourceId } : null, selectedTopics)}
      />
    </Screen>
  );
}
