import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { ErrorText, Screen } from '../components/ui';
import { ShareCard } from '../components/PostCard';
import type { SocialShare } from '../api/types';
import { colors, radius, shadow, spacing, type } from '../theme';

export const POST_KINDS = [
  { id: 'IMAGE', label: 'Imagem', icon: 'image-outline' },
  { id: 'VIDEO', label: 'Vídeo', icon: 'videocam-outline' },
  { id: 'VERSE', label: 'Versículo', icon: 'book-outline' },
  { id: 'CATECHISM', label: 'Catecismo', icon: 'library-outline' },
  { id: 'DOCUMENT', label: 'Biblioteca', icon: 'documents-outline' },
  { id: 'DIRECTORY', label: 'Diretório', icon: 'map-outline' },
  { id: 'AI_ARTIFACT', label: 'Editorial', icon: 'sparkles-outline' },
] as const;

export type PostKind = (typeof POST_KINDS)[number]['id'];

type Hit = { id: string; title: string };
export type DraftMedia = { mediaId: string; url: string; kind: 'IMAGE' | 'VIDEO' };

const SHARE_KINDS = ['VERSE', 'CATECHISM', 'DOCUMENT', 'DIRECTORY', 'AI_ARTIFACT'] as const;

export function ComposeScreen({
  canPublish,
  accessLoading,
  onPublish,
  onPreviewShare,
  preview,
  busy,
  error,
  initialKind = '',
  initialSourceId = '',
  onOpenBible,
  onSearch,
  onPickMedia,
}: {
  canPublish: boolean;
  accessLoading?: boolean;
  onPublish: (
    body: string,
    extra: { share?: { kind: string; sourceId: string } | null; mediaIds: string[]; mediaConsentAck: boolean },
  ) => Promise<void> | void;
  onPreviewShare?: (kind: string, sourceId: string) => Promise<void> | void;
  preview?: SocialShare | null;
  busy?: boolean;
  error?: string | null;
  initialKind?: string;
  initialSourceId?: string;
  onOpenBible?: () => void;
  onSearch?: (kind: PostKind, query: string) => Promise<Hit[]>;
  onPickMedia?: (kind: 'IMAGE' | 'VIDEO') => Promise<DraftMedia | null>;
}) {
  const shareStart = SHARE_KINDS.includes(initialKind as (typeof SHARE_KINDS)[number]) ? initialKind : null;
  const [shareKind, setShareKind] = useState<string | null>(shareStart);
  const [body, setBody] = useState('');
  const [sourceId, setSourceId] = useState(initialSourceId);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [media, setMedia] = useState<DraftMedia[]>([]);
  const [consent, setConsent] = useState(false);
  const [picking, setPicking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const blocked = !canPublish && !accessLoading;
  const ready = Boolean(body.trim() || sourceId || media.length);

  useEffect(() => {
    if (shareKind && initialSourceId) onPreviewShare?.(shareKind, initialSourceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareKind, initialSourceId]);

  const pick = async (kind: 'IMAGE' | 'VIDEO') => {
    if (!onPickMedia) return;
    setPicking(true);
    setLocalError(null);
    try {
      const item = await onPickMedia(kind);
      if (item) setMedia((current) => [...current, item]);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Não foi possível anexar.');
    } finally {
      setPicking(false);
    }
  };

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
            ...shadow.card,
          }}
        >
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            autoFocus
            testID="compose-body"
            placeholder="O que quer partilhar?"
            placeholderTextColor={colors.inkMuted}
            style={{ minHeight: 140, color: colors.ink, fontFamily: type.body, fontSize: 20, lineHeight: 30, textAlignVertical: 'top' }}
          />
          {media.length ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.sm }}>
              {media.map((item) => (
                <View key={item.mediaId}>
                  {item.kind === 'IMAGE' ? (
                    <Image source={{ uri: item.url }} style={{ width: 92, height: 92, borderRadius: 12 }} />
                  ) : (
                    <View style={{ width: 92, height: 92, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="play" size={22} color={colors.goldLight} />
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : null}
          <View testID="compose-kinds" style={{ flexDirection: 'row', gap: 4, marginTop: spacing.md, flexWrap: 'wrap' }}>
            {POST_KINDS.map((item) => {
              const active = item.id === 'IMAGE' || item.id === 'VIDEO' ? media.some((row) => row.kind === item.id) : shareKind === item.id;
              return (
                <Pressable
                  key={item.id}
                  testID={`compose-kind-${item.id}`}
                  accessibilityLabel={item.label}
                  onPress={() => {
                    if (item.id === 'IMAGE' || item.id === 'VIDEO') {
                      void pick(item.id);
                      return;
                    }
                    setShareKind((current) => (current === item.id ? null : item.id));
                    setHits([]);
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? colors.ink : colors.cream,
                  }}
                >
                  <Ionicons name={item.icon as any} size={20} color={active ? colors.goldLight : colors.goldDark} />
                </Pressable>
              );
            })}
          </View>
        </View>
        {shareKind === 'VERSE' && onOpenBible ? (
          <Pressable onPress={onOpenBible} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.ink, fontFamily: type.bodyBold }}>Abrir a Bíblia</Text>
          </Pressable>
        ) : null}
        {shareKind && shareKind !== 'VERSE' ? (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            onSubmitEditing={async () => {
              if (!onSearch) return;
              setHits(await onSearch(shareKind as PostKind, query));
            }}
            style={{
              marginTop: spacing.md,
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
        ) : null}
        {hits.map((hit) => (
          <Pressable
            key={hit.id}
            onPress={() => {
              setSourceId(hit.id);
              if (shareKind) onPreviewShare?.(shareKind, hit.id);
            }}
            style={{ paddingVertical: 10 }}
          >
            <Text style={{ color: sourceId === hit.id ? colors.goldDark : colors.ink, fontFamily: type.bodyBold }}>{hit.title}</Text>
          </Pressable>
        ))}
        {media.length ? (
          <Pressable onPress={() => setConsent((value) => !value)} style={{ marginTop: spacing.md }} testID="compose-consent">
            <Text style={{ color: consent ? colors.ink : colors.muted, fontFamily: type.body }}>
              {consent ? 'Uso de imagem confirmado' : 'Confirmo o uso de imagem'}
            </Text>
          </Pressable>
        ) : null}
        <ErrorText message={localError || error} />
        {blocked ? (
          <Text style={{ color: colors.goldDark, fontFamily: type.body, marginTop: spacing.sm }}>Publicar pede assinatura.</Text>
        ) : null}
        {preview ? (
          <View style={{ marginTop: spacing.sm }}>
            <ShareCard kind={preview.sourceLabel || preview.kind} title={preview.title} subtitle={preview.subtitle} excerpt={preview.excerpt} />
          </View>
        ) : null}
        {picking ? <Text style={{ color: colors.muted, marginTop: spacing.sm, fontFamily: type.body }}>A enviar…</Text> : null}
      </Screen>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, backgroundColor: colors.cream }}>
        <Pressable
          testID="compose-submit"
          disabled={blocked || busy || picking || !ready || (media.length > 0 && !consent)}
          onPress={() =>
            onPublish(body.trim(), {
              share: shareKind && sourceId ? { kind: shareKind, sourceId } : null,
              mediaIds: media.map((item) => item.mediaId),
              mediaConsentAck: consent,
            })
          }
          style={{
            backgroundColor: colors.gold,
            borderRadius: radius.md,
            minHeight: 52,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: blocked || busy || picking || !ready || (media.length > 0 && !consent) ? 0.45 : 1,
          }}
        >
          <Text style={{ color: colors.ink, fontFamily: type.bodyBold, fontSize: 17 }}>{busy ? 'A publicar…' : 'Publicar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
