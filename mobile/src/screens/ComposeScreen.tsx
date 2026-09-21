import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { BrandButton, ErrorText, Screen } from '../components/ui';
import { ShareCard } from '../components/PostCard';
import type { SocialShare } from '../api/types';
import { colors, spacing, type } from '../theme';

export function ComposeScreen({
  canPublish,
  accessLoading,
  onPublish,
  onPreviewShare,
  preview,
  busy,
  error,
}: {
  canPublish: boolean;
  accessLoading?: boolean;
  onPublish: (body: string, share?: { kind: string; sourceId: string } | null) => Promise<void> | void;
  onPreviewShare?: (kind: string, sourceId: string) => Promise<void> | void;
  preview?: SocialShare | null;
  busy?: boolean;
  error?: string | null;
}) {
  const [body, setBody] = useState('');
  const [kind, setKind] = useState('VERSE');
  const [sourceId, setSourceId] = useState('');
  const [attach, setAttach] = useState(false);

  return (
    <Screen testID="compose-screen">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Text style={{ color: colors.ink, fontFamily: type.display, fontSize: 32 }}>Novo</Text>
        <BrandButton
          testID="compose-submit"
          label={busy ? '…' : 'Publicar'}
          disabled={(!canPublish && !accessLoading) || busy || !body.trim()}
          onPress={() => onPublish(body.trim(), sourceId ? { kind, sourceId } : null)}
        />
      </View>
      <ErrorText message={error} />
      {!canPublish && !accessLoading ? (
        <Text style={{ color: colors.goldDark, fontFamily: type.body, marginBottom: spacing.sm }}>Publicar pede assinatura.</Text>
      ) : null}
      <TextInput
        value={body}
        onChangeText={setBody}
        multiline
        testID="compose-body"
        placeholder="O que quer partilhar?"
        placeholderTextColor={colors.muted}
        style={{
          minHeight: 160,
          color: colors.ink,
          fontFamily: type.body,
          fontSize: 18,
          lineHeight: 26,
          textAlignVertical: 'top',
        }}
      />
      <Pressable onPress={() => setAttach((value) => !value)} style={{ marginTop: spacing.md }}>
        <Text style={{ color: colors.goldDark, fontFamily: type.bodyBold }}>Versículo</Text>
      </Pressable>
      {attach ? (
        <View style={{ marginTop: spacing.sm, gap: 8 }}>
          <TextInput
            value={kind}
            onChangeText={setKind}
            placeholder="VERSE"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={{ color: colors.ink, fontFamily: type.body, borderBottomWidth: 1, borderBottomColor: colors.line, minHeight: 40 }}
          />
          <TextInput
            value={sourceId}
            onChangeText={setSourceId}
            testID="compose-share-id"
            placeholder="livro:capítulo:versículo"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={{ color: colors.ink, fontFamily: type.body, borderBottomWidth: 1, borderBottomColor: colors.line, minHeight: 40 }}
          />
          {onPreviewShare ? (
            <Pressable onPress={() => sourceId && onPreviewShare(kind, sourceId)}>
              <Text style={{ color: colors.ink, fontFamily: type.bodyMedium }}>Pré-visualizar</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {preview ? (
        <ShareCard kind={preview.kind} title={preview.title} subtitle={preview.subtitle} excerpt={preview.excerpt} />
      ) : null}
    </Screen>
  );
}
