import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ErrorText, Screen } from '../components/ui';
import { ShareCard } from '../components/PostCard';
import type { SocialShare } from '../api/types';
import { colors, radius, shadow, spacing, type } from '../theme';

export const POST_KINDS = [
  { id: 'TEXT', label: 'Texto', icon: 'create-outline' },
  { id: 'VERSE', label: 'Versículo', icon: 'book-outline' },
  { id: 'CATECHISM', label: 'Catecismo', icon: 'library-outline' },
  { id: 'DOCUMENT', label: 'Biblioteca', icon: 'documents-outline' },
  { id: 'DIRECTORY', label: 'Diretório', icon: 'map-outline' },
  { id: 'AI_ARTIFACT', label: 'Editorial', icon: 'sparkles-outline' },
] as const;

export type PostKind = (typeof POST_KINDS)[number]['id'];

type Hit = { id: string; title: string };

export function ComposeScreen({
  canPublish,
  accessLoading,
  onPublish,
  onPreviewShare,
  preview,
  busy,
  error,
  initialKind = 'TEXT',
  initialSourceId = '',
  onOpenBible,
  onSearch,
}: {
  canPublish: boolean;
  accessLoading?: boolean;
  onPublish: (body: string, share?: { kind: string; sourceId: string } | null) => Promise<void> | void;
  onPreviewShare?: (kind: string, sourceId: string) => Promise<void> | void;
  preview?: SocialShare | null;
  busy?: boolean;
  error?: string | null;
  initialKind?: string;
  initialSourceId?: string;
  onOpenBible?: () => void;
  onSearch?: (kind: PostKind, query: string) => Promise<Hit[]>;
}) {
  const known = POST_KINDS.some((item) => item.id === initialKind);
  const [kind, setKind] = useState<PostKind | null>(initialSourceId && known ? (initialKind as PostKind) : null);
  const [body, setBody] = useState('');
  const [sourceId, setSourceId] = useState(initialSourceId);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const blocked = !canPublish && !accessLoading;
  const current = POST_KINDS.find((item) => item.id === kind);
  const ready = Boolean(body.trim() || (kind && kind !== 'TEXT' && sourceId));

  useEffect(() => {
    if (kind && kind !== 'TEXT' && initialSourceId) onPreviewShare?.(kind, initialSourceId);
    // Preview the attachment that opened this screen once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, initialSourceId]);

  const choose = (next: PostKind) => {
    setKind(next);
    setSourceId(next === initialKind ? initialSourceId : '');
    setHits([]);
    setQuery('');
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen testID="compose-screen" contentStyle={{ paddingTop: 8 }}>
        <Text style={{ color: colors.ink, fontFamily: type.display, fontSize: 34, lineHeight: 38, marginBottom: spacing.md }}>
          Publicar
        </Text>
        {kind ? (
          <Pressable onPress={() => setKind(null)} style={{ marginBottom: spacing.sm }}>
            <Text style={{ color: colors.goldDark, fontFamily: type.bodyBold }}>{current?.label}</Text>
          </Pressable>
        ) : (
          <View testID="compose-kinds" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {POST_KINDS.map((item) => (
              <Pressable
                key={item.id}
                testID={`compose-kind-${item.id}`}
                onPress={() => choose(item.id)}
                style={{
                  width: '47%',
                  minHeight: 96,
                  backgroundColor: colors.paper,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.line,
                  padding: spacing.md,
                  justifyContent: 'space-between',
                  ...shadow.card,
                }}
              >
                <Ionicons name={item.icon as any} size={22} color={colors.goldDark} />
                <Text style={{ color: colors.ink, fontFamily: type.bodyBold, fontSize: 16 }}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {kind ? (
          <View
            style={{
              backgroundColor: colors.paper,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.line,
              padding: spacing.lg,
              minHeight: 180,
              ...shadow.card,
            }}
          >
            <View style={{ width: 36, height: 3, borderRadius: 2, backgroundColor: colors.gold, marginBottom: spacing.md }} />
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              testID="compose-body"
              placeholder="Escreva aqui"
              placeholderTextColor={colors.inkMuted}
              style={{ minHeight: 120, color: colors.ink, fontFamily: type.body, fontSize: 20, lineHeight: 30, textAlignVertical: 'top' }}
            />
          </View>
        ) : null}
        {kind === 'VERSE' && onOpenBible ? (
          <Pressable onPress={onOpenBible} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.ink, fontFamily: type.bodyBold }}>Abrir a Bíblia</Text>
          </Pressable>
        ) : null}
        {kind && kind !== 'TEXT' && kind !== 'VERSE' ? (
          <View style={{ marginTop: spacing.md }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              onSubmitEditing={async () => {
                if (!onSearch) return;
                setHits(await onSearch(kind, query));
              }}
              style={{
                backgroundColor: colors.paper,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: colors.line,
                minHeight: 44,
                paddingHorizontal: 16,
                color: colors.ink,
                fontFamily: type.body,
              }}
            />
            {hits.map((hit) => (
              <Pressable
                key={hit.id}
                onPress={() => {
                  setSourceId(hit.id);
                  onPreviewShare?.(kind, hit.id);
                }}
                style={{ paddingVertical: 10 }}
              >
                <Text style={{ color: sourceId === hit.id ? colors.goldDark : colors.ink, fontFamily: type.bodyBold }}>{hit.title}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <ErrorText message={error} />
        {blocked ? (
          <Text style={{ color: colors.goldDark, fontFamily: type.body, marginTop: spacing.sm }}>Publicar pede assinatura.</Text>
        ) : null}
        {preview ? (
          <View style={{ marginTop: spacing.sm }}>
            <ShareCard kind={preview.sourceLabel || preview.kind} title={preview.title} subtitle={preview.subtitle} excerpt={preview.excerpt} />
          </View>
        ) : null}
      </Screen>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg, backgroundColor: colors.cream }}>
        <Pressable
          testID="compose-submit"
          disabled={!kind || blocked || busy || !ready}
          onPress={() => onPublish(body.trim(), kind && kind !== 'TEXT' && sourceId ? { kind, sourceId } : null)}
          style={{
            backgroundColor: colors.gold,
            borderRadius: radius.md,
            minHeight: 52,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !kind || blocked || busy || !ready ? 0.45 : 1,
          }}
        >
          <Text style={{ color: colors.ink, fontFamily: type.bodyBold, fontSize: 17 }}>{busy ? 'A publicar…' : 'Publicar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
