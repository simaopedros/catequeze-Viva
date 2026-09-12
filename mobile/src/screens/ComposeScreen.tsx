import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BrandButton, ErrorText, Field, Screen, ScreenTitle } from '../components/ui';
import { ShareCard } from '../components/PostCard';
import type { SocialShare } from '../api/types';
import { colors, fonts, spacing } from '../theme';

export function ComposeScreen({
  canPublish,
  accessLoading,
  onPublish,
  onPreviewShare,
  preview,
  busy,
  error,
  onAttachVerse,
  onAttachMeeting,
}: {
  canPublish: boolean;
  accessLoading?: boolean;
  onPublish: (body: string, share?: { kind: string; sourceId: string } | null) => Promise<void> | void;
  onPreviewShare?: (kind: string, sourceId: string) => Promise<void> | void;
  preview?: SocialShare | null;
  busy?: boolean;
  error?: string | null;
  onAttachVerse?: () => void;
  onAttachMeeting?: () => void;
}) {
  const [body, setBody] = useState('');
  const [kind, setKind] = useState('VERSE');
  const [sourceId, setSourceId] = useState('');

  return (
    <Screen testID="compose-screen">
      <ScreenTitle
        title="Nova publicação"
        subtitle={
          accessLoading
            ? 'Verificando se a sua conta pode publicar…'
            : canPublish
              ? 'Um momento, um verso ou um encontro.'
              : 'A publicação exige assinatura.'
        }
      />
      <ErrorText message={error} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
        <Pressable
          testID="compose-shortcut-verse"
          onPress={() => {
            setKind('VERSE');
            onAttachVerse?.();
          }}
          style={{ flex: 1, minHeight: 44, backgroundColor: colors.canvas, borderRadius: 12, padding: 10, justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: fonts.sansSemi, color: colors.ink }}>Verso</Text>
        </Pressable>
        <Pressable
          testID="compose-shortcut-meeting"
          onPress={() => {
            setKind('MEETING');
            onAttachMeeting?.();
          }}
          style={{ flex: 1, minHeight: 44, backgroundColor: colors.canvas, borderRadius: 12, padding: 10, justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: fonts.sansSemi, color: colors.ink }}>Encontro</Text>
        </Pressable>
      </View>
      <Field label="Texto" value={body} onChangeText={setBody} multiline testID="compose-body" />
      <Field
        label="ID da fonte (opcional)"
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
      {preview ? (
        <ShareCard kind={preview.kind} title={preview.title} subtitle={preview.subtitle} excerpt={preview.excerpt} />
      ) : null}
      <BrandButton
        testID="compose-submit"
        label={busy ? 'A publicar…' : 'Publicar'}
        disabled={(!canPublish && !accessLoading) || busy || !body.trim()}
        onPress={() => onPublish(body.trim(), sourceId ? { kind, sourceId } : null)}
      />
    </Screen>
  );
}
