import React, { useMemo, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { BrandButton, ErrorText, Screen, ScreenTitle } from '../components/ui';
import { ShareCard } from '../components/PostCard';
import type { SocialAccess, SocialShare, SocialTopic } from '../api/types';
import { communityPublishNotice, MAX_POST_BODY_LENGTH, MAX_TOPICS_PER_POST } from '../lib/social';
import { colors, fonts, spacing } from '../theme';

export type DraftMedia = {
  mediaId: string;
  kind: 'IMAGE' | 'VIDEO';
  url?: string | null;
};

export type SharePickerHit = {
  id: string;
  title: string;
  subtitle?: string;
};

export type ComposeDraft = {
  body: string;
  topicSlugs: string[];
  mediaIds: string[];
  mediaConsentAck: boolean;
  share: { kind: string; sourceId: string } | null;
};

export function ComposeScreen({
  canPublish,
  access,
  accessLoading,
  topics,
  media,
  preview,
  pickerHits,
  pickerKind,
  busy,
  error,
  initialBody,
  onPublish,
  onPickImage,
  onPickVideo,
  onRemoveMedia,
  onPreviewShare,
  onOpenVersePicker,
  onSearchPicker,
  onClosePicker,
}: {
  canPublish: boolean;
  access?: SocialAccess | null;
  accessLoading?: boolean;
  topics: SocialTopic[];
  media: DraftMedia[];
  preview?: SocialShare | null;
  pickerHits?: SharePickerHit[];
  pickerKind?: 'CATECHISM' | 'DOCUMENT' | null;
  busy?: boolean;
  error?: string | null;
  initialBody?: string;
  onPublish: (draft: ComposeDraft) => Promise<void> | void;
  onPickImage: () => void;
  onPickVideo: () => void;
  onRemoveMedia: (mediaId: string) => void;
  onPreviewShare: (kind: string, sourceId: string) => void;
  onOpenVersePicker: () => void;
  onSearchPicker: (kind: 'CATECHISM' | 'DOCUMENT', query: string) => void;
  onClosePicker: () => void;
}) {
  const [body, setBody] = useState(initialBody || '');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const notice = communityPublishNotice(access);
  const share = preview?.sourceId ? { kind: preview.kind, sourceId: preview.sourceId } : null;
  const canSubmit =
    canPublish &&
    !busy &&
    (body.trim().length > 0 || media.length > 0 || Boolean(share)) &&
    (media.length === 0 || consent);

  const placeholder = preview
    ? 'Acrescente uma palavra sobre este conteúdo...'
    : 'Compartilhe algo com a comunidade...';

  const topicPills = useMemo(() => topics.slice(0, 24), [topics]);

  function toggleTopic(slug: string) {
    setSelectedTopics((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug);
      if (current.length >= MAX_TOPICS_PER_POST) return current;
      return [...current, slug];
    });
  }

  return (
    <Screen testID="compose-screen">
      <ScreenTitle title="Nova publicação" />
      {accessLoading ? <Text style={{ color: colors.muted, marginBottom: spacing.sm }}>A verificar a sua conta…</Text> : null}
      {notice ? (
        <Text testID="compose-notice" style={{ color: colors.goldDark, fontFamily: fonts.sansMedium, marginBottom: spacing.md }}>
          {notice}
        </Text>
      ) : null}
      <ErrorText message={error} />
      <TextInput
        testID="compose-body"
        value={body}
        onChangeText={(value) => setBody(value.slice(0, MAX_POST_BODY_LENGTH))}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline
        maxLength={MAX_POST_BODY_LENGTH}
        style={{
          minHeight: 120,
          fontFamily: fonts.sans,
          fontSize: 17,
          lineHeight: 24,
          color: colors.ink,
          marginBottom: spacing.md,
        }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
        <BrandButton label="Imagem" variant="ghost" onPress={onPickImage} testID="compose-image" />
        <BrandButton label="Vídeo" variant="ghost" onPress={onPickVideo} testID="compose-video" />
        <BrandButton label="Temas" variant="ghost" onPress={() => undefined} testID="compose-topics" />
      </View>
      {media.map((item) => (
        <Pressable key={item.mediaId} testID={`compose-media-${item.mediaId}`} onPress={() => onRemoveMedia(item.mediaId)}>
          {item.kind === 'IMAGE' && item.url ? (
            <Image source={{ uri: item.url }} style={{ width: '100%', height: 180, borderRadius: 16, marginBottom: 8 }} />
          ) : (
            <Text style={{ color: colors.goldDark, marginBottom: 8 }}>Vídeo anexado · toque para remover</Text>
          )}
        </Pressable>
      ))}
      {media.length > 0 ? (
        <Pressable
          testID="compose-consent"
          onPress={() => setConsent((value) => !value)}
          style={{ minHeight: 44, marginBottom: spacing.md, justifyContent: 'center' }}
        >
          <Text style={{ color: consent ? colors.ink : colors.muted, fontFamily: fonts.sansMedium }}>
            {consent ? '☑ ' : '☐ '}
            Confirmo que tenho autorização de uso de imagem das pessoas retratadas, incluindo responsáveis por crianças e adolescentes.
          </Text>
        </Pressable>
      ) : null}
      <Text style={{ color: colors.ink, fontFamily: fonts.sansBold, marginBottom: 4 }}>Temas</Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.sansMedium, marginBottom: 8 }}>Escolha até 3 temas</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
        {topicPills.map((topic) => {
          const on = selectedTopics.includes(topic.slug);
          return (
            <Pressable
              key={topic.slug}
              testID={`compose-topic-${topic.slug}`}
              onPress={() => toggleTopic(topic.slug)}
              style={{
                minHeight: 36,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: on ? colors.ink : colors.line,
                backgroundColor: on ? colors.ink : colors.white,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: on ? colors.white : colors.ink, fontFamily: fonts.sansSemi }}>{topic.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
        <Pressable testID="compose-shortcut-verse" onPress={onOpenVersePicker} style={chip}>
          <Text style={chipLabel}>Versículo</Text>
        </Pressable>
        <Pressable testID="compose-shortcut-catechism" onPress={() => onSearchPicker('CATECHISM', '')} style={chip}>
          <Text style={chipLabel}>Catecismo</Text>
        </Pressable>
        <Pressable testID="compose-shortcut-library" onPress={() => onSearchPicker('DOCUMENT', '')} style={chip}>
          <Text style={chipLabel}>Biblioteca</Text>
        </Pressable>
        <Pressable
          testID="compose-shortcut-meeting"
          onPress={() => {
            setBody((current) => current || 'Paz e bem. Partilho um encontro da catequese.');
            const testemunho = topics.find((topic) => topic.slug === 'testemunho');
            if (testemunho) setSelectedTopics((current) => (current.includes(testemunho.slug) ? current : [...current, testemunho.slug].slice(0, 3)));
          }}
          style={chip}
        >
          <Text style={chipLabel}>Encontro</Text>
        </Pressable>
      </View>
      {preview ? (
        <ShareCard kind={preview.sourceLabel || preview.kind} title={preview.title} subtitle={preview.subtitle} excerpt={preview.excerpt} />
      ) : null}
      {pickerKind ? (
        <View testID="compose-picker" style={{ marginBottom: spacing.md }}>
          <TextInput
            testID="compose-picker-query"
            value={pickerQuery}
            onChangeText={setPickerQuery}
            placeholder={pickerKind === 'CATECHISM' ? 'Pesquisar o Catecismo' : 'Pesquisar a biblioteca'}
            placeholderTextColor={colors.muted}
            style={{ minHeight: 44, borderBottomWidth: 1, borderBottomColor: colors.line, marginBottom: 8, fontFamily: fonts.sans, color: colors.ink }}
          />
          <BrandButton label="Procurar" onPress={() => onSearchPicker(pickerKind, pickerQuery)} testID="compose-picker-search" />
          {(pickerHits || []).map((hit) => (
            <Pressable
              key={hit.id}
              testID={`compose-pick-${hit.id}`}
              onPress={() => onPreviewShare(pickerKind, hit.id)}
              style={{ minHeight: 44, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.line }}
            >
              <Text style={{ color: colors.ink, fontFamily: fonts.sansSemi }}>{hit.title}</Text>
              {hit.subtitle ? <Text style={{ color: colors.muted }}>{hit.subtitle}</Text> : null}
            </Pressable>
          ))}
          <BrandButton variant="ghost" label="Fechar pesquisa" onPress={onClosePicker} />
        </View>
      ) : null}
      <BrandButton
        testID="compose-submit"
        label={busy ? 'A publicar…' : 'Publicar'}
        disabled={!canSubmit}
        onPress={() =>
          onPublish({
            body: body.trim(),
            topicSlugs: selectedTopics,
            mediaIds: media.map((item) => item.mediaId),
            mediaConsentAck: consent,
            share,
          })
        }
      />
    </Screen>
  );
}

const chip = {
  minHeight: 44,
  paddingHorizontal: 12,
  borderRadius: 12,
  backgroundColor: colors.canvas,
  justifyContent: 'center' as const,
};
const chipLabel = { fontFamily: fonts.sansSemi, color: colors.ink };
