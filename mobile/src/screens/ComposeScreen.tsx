import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ErrorText, Screen } from '../components/ui';
import { ShareCard } from '../components/PostCard';
import type { SocialShare } from '../api/types';
import { colors, radius, shadow, spacing, type } from '../theme';

export function ComposeScreen({
  canPublish,
  accessLoading,
  onPublish,
  onPreviewShare,
  preview,
  busy,
  error,
  initialSourceId = '',
}: {
  canPublish: boolean;
  accessLoading?: boolean;
  onPublish: (body: string, share?: { kind: string; sourceId: string } | null) => Promise<void> | void;
  onPreviewShare?: (kind: string, sourceId: string) => Promise<void> | void;
  preview?: SocialShare | null;
  busy?: boolean;
  error?: string | null;
  initialSourceId?: string;
}) {
  const [body, setBody] = useState('');
  const [sourceId, setSourceId] = useState(initialSourceId);
  const [attach, setAttach] = useState(Boolean(initialSourceId));
  const kind = 'VERSE';
  const blocked = !canPublish && !accessLoading;

  return (
    <View style={{ flex: 1 }}>
      <Screen testID="compose-screen" contentStyle={{ paddingTop: 8 }}>
        <Text style={{ color: colors.ink, fontFamily: type.display, fontSize: 34, lineHeight: 38, marginBottom: spacing.md }}>
          Publicar
        </Text>
        <View
          style={{
            backgroundColor: colors.paper,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.line,
            padding: spacing.lg,
            minHeight: 280,
            ...shadow.card,
          }}
        >
          <View style={{ width: 36, height: 3, borderRadius: 2, backgroundColor: colors.gold, marginBottom: spacing.md }} />
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            autoFocus
            testID="compose-body"
            placeholder="Escreva aqui"
            placeholderTextColor={colors.inkMuted}
            style={{
              minHeight: 180,
              color: colors.ink,
              fontFamily: type.body,
              fontSize: 20,
              lineHeight: 30,
              textAlignVertical: 'top',
            }}
          />
          <Text style={{ alignSelf: 'flex-end', color: colors.muted, fontFamily: type.body, fontSize: 12 }}>
            {body.trim().length}
          </Text>
        </View>
        <ErrorText message={error} />
        {blocked ? (
          <Text style={{ color: colors.goldDark, fontFamily: type.body, marginTop: spacing.sm }}>
            Publicar pede assinatura.
          </Text>
        ) : null}
        <Pressable
          onPress={() => setAttach((value) => !value)}
          style={{
            marginTop: spacing.md,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: attach ? colors.ink : colors.paper,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: attach ? colors.ink : colors.line,
            paddingHorizontal: 14,
            minHeight: 40,
          }}
        >
          <Ionicons name="book-outline" size={16} color={attach ? colors.goldLight : colors.goldDark} />
          <Text style={{ color: attach ? colors.white : colors.ink, fontFamily: type.bodyBold }}>Versículo</Text>
        </Pressable>
        {attach ? (
          <View
            style={{
              marginTop: spacing.sm,
              backgroundColor: colors.paper,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.line,
              padding: spacing.md,
            }}
          >
            <TextInput
              value={sourceId}
              onChangeText={setSourceId}
              testID="compose-share-id"
              placeholder="jo:3:16"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              onEndEditing={() => sourceId && onPreviewShare?.(kind, sourceId)}
              style={{ color: colors.ink, fontFamily: type.body, fontSize: 16, minHeight: 40 }}
            />
            {onPreviewShare ? (
              <Pressable onPress={() => sourceId && onPreviewShare(kind, sourceId)} style={{ marginTop: 4 }}>
                <Text style={{ color: colors.goldDark, fontFamily: type.bodyBold }}>Ver</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {preview ? (
          <View style={{ marginTop: spacing.sm }}>
            <ShareCard kind={preview.sourceLabel || preview.kind} title={preview.title} subtitle={preview.subtitle} excerpt={preview.excerpt} />
          </View>
        ) : null}
      </Screen>
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.lg,
          backgroundColor: colors.cream,
          borderTopWidth: 1,
          borderTopColor: colors.line,
        }}
      >
        <Pressable
          testID="compose-submit"
          disabled={blocked || busy || !body.trim()}
          onPress={() => onPublish(body.trim(), sourceId ? { kind, sourceId } : null)}
          style={{
            backgroundColor: colors.gold,
            borderRadius: radius.md,
            minHeight: 52,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: blocked || busy || !body.trim() ? 0.45 : 1,
          }}
        >
          <Text style={{ color: colors.ink, fontFamily: type.bodyBold, fontSize: 17 }}>
            {busy ? 'A publicar…' : 'Publicar'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
