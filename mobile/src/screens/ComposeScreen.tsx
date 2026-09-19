import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Chip, Text, TextInput } from 'react-native-paper';
import { BrandButton, Card, ErrorText, Field, Icon, Row, Screen, ScreenTitle, SectionHeader } from '../components/ui';
import { ShareCard } from '../components/PostCard';
import { resolveMediaUrl } from '../api/mediaUrl';
import type { SocialShare, SocialTopic } from '../api/types';
import { colors, radius, spacing } from '../theme';

export type ComposeAttachment = { mediaId: string; url?: string | null; kind: 'IMAGE' | 'VIDEO' };

const MAX_BODY = 2000;

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
  attachments,
  onAddImage,
  onAddVideo,
  onRemoveAttachment,
  mediaBusy,
  authorName,
  authorAvatarUrl,
}: {
  canPublish: boolean;
  accessLoading?: boolean;
  onPublish: (body: string, share?: { kind: string; sourceId: string } | null, topicSlugs?: string[], mediaIds?: string[]) => Promise<void> | void;
  onPreviewShare?: (kind: string, sourceId: string) => Promise<void> | void;
  preview?: SocialShare | null;
  busy?: boolean;
  error?: string | null;
  initialKind?: string;
  initialSourceId?: string;
  topics?: SocialTopic[];
  selectedTopics?: string[];
  onToggleTopic?: (slug: string) => void;
  attachments?: ComposeAttachment[];
  onAddImage?: () => void;
  onAddVideo?: () => void;
  onRemoveAttachment?: (mediaId: string) => void;
  mediaBusy?: boolean;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
}) {
  const [body, setBody] = useState('');
  const [kind, setKind] = useState(initialKind || 'VERSE');
  const [sourceId, setSourceId] = useState(initialSourceId || '');
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <Screen testID="compose-screen">
      <ScreenTitle
        title="Nova publicação"
        subtitle={accessLoading ? 'A verificar se a sua conta pode publicar…' : canPublish ? 'Partilhe um momento ou um versículo com a Comunidade.' : 'A publicação exige assinatura.'}
      />
      <ErrorText message={error} />
      {!canPublish && !accessLoading ? (
        <Card tone="gold">
          <Row>
            <Icon name="lock-outline" color={colors.goldDark} />
            <Text variant="bodyMedium" style={{ color: colors.goldDark, flex: 1 }}>
              Pode ler e seguir. Para publicar, precisa de uma assinatura ativa na plataforma web.
            </Text>
          </Row>
        </Card>
      ) : null}
      <Card>
        <TextInput
          testID="compose-body"
          mode="flat"
          placeholder="Em que está a pensar? Partilhe uma palavra, uma oração ou um momento da catequese."
          value={body}
          onChangeText={(value) => setBody(value.slice(0, MAX_BODY))}
          multiline
          numberOfLines={6}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          style={{ backgroundColor: 'transparent', minHeight: 140, fontSize: 17, paddingHorizontal: 0 }}
          placeholderTextColor={colors.muted}
          textColor={colors.ink}
        />
        {preview ? <ShareCard kind={preview.kind} title={preview.title} subtitle={preview.subtitle} excerpt={preview.excerpt} /> : null}
        {attachments && attachments.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm }}>
            {attachments.map((attachment) => {
              const uri = resolveMediaUrl(attachment.url);
              return (
                <View key={attachment.mediaId} style={{ position: 'relative' }}>
                  {uri && attachment.kind === 'IMAGE' ? (
                    <Image source={{ uri }} style={{ width: 84, height: 84, borderRadius: radius.md }} />
                  ) : (
                    <View style={{ width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="play-circle-outline" size={28} color={colors.white} />
                    </View>
                  )}
                  {onRemoveAttachment ? (
                    <Pressable
                      testID={`remove-attachment-${attachment.mediaId}`}
                      onPress={() => onRemoveAttachment(attachment.mediaId)}
                      style={{ position: 'absolute', top: -6, right: -6, backgroundColor: colors.danger, borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="close" size={14} color={colors.white} />
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
        <Row style={{ marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm }}>
          {onAddImage ? (
            <Pressable testID="compose-add-image" onPress={onAddImage} disabled={mediaBusy} style={{ padding: 6 }} accessibilityLabel="Adicionar imagem">
              <Icon name="image-plus" size={24} color={mediaBusy ? colors.line : colors.ink} />
            </Pressable>
          ) : null}
          {onAddVideo ? (
            <Pressable testID="compose-add-video" onPress={onAddVideo} disabled={mediaBusy} style={{ padding: 6 }} accessibilityLabel="Adicionar vídeo">
              <Icon name="video-plus-outline" size={24} color={mediaBusy ? colors.line : colors.ink} />
            </Pressable>
          ) : null}
          {!initialSourceId ? (
            <Pressable testID="compose-share-toggle" onPress={() => setShareOpen((value) => !value)} style={{ padding: 6 }} accessibilityLabel="Partilhar fonte">
              <Icon name="book-open-page-variant-outline" size={24} color={shareOpen ? colors.goldDark : colors.ink} />
            </Pressable>
          ) : null}
          {mediaBusy ? (
            <Text variant="labelSmall" style={{ color: colors.muted }}>
              A enviar…
            </Text>
          ) : null}
          <Text variant="labelSmall" style={{ color: body.length > MAX_BODY * 0.9 ? colors.danger : colors.muted, marginLeft: 'auto' }}>
            {body.length}/{MAX_BODY}
          </Text>
        </Row>
      </Card>

      {topics && topics.length > 0 && onToggleTopic ? (
        <>
          <SectionHeader title="Tópicos" icon="pound" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm }}>
            {topics.map((topic) => {
              const active = (selectedTopics ?? []).includes(topic.slug);
              return (
                <Chip
                  key={topic.slug}
                  testID={`compose-topic-${topic.slug}`}
                  selected={active}
                  showSelectedCheck={false}
                  mode={active ? 'flat' : 'outlined'}
                  onPress={() => onToggleTopic(topic.slug)}
                  style={{ backgroundColor: active ? colors.ink : colors.surface, borderColor: colors.line }}
                  textStyle={{ color: active ? colors.white : colors.ink }}
                >
                  {topic.name}
                </Chip>
              );
            })}
          </View>
        </>
      ) : null}

      {!initialSourceId && shareOpen ? (
        <Card>
          <Text variant="titleSmall" style={{ color: colors.ink, marginBottom: spacing.sm }}>
            Partilhar uma fonte
          </Text>
          <Field label="Tipo (VERSE, POST, MEETING…)" icon="tag-outline" value={kind} onChangeText={setKind} />
          <Field label="ID da fonte (ex. bookId:chapter:verse)" icon="identifier" value={sourceId} onChangeText={setSourceId} testID="compose-share-id" />
          {onPreviewShare ? <BrandButton variant="ghost" icon="eye-outline" label="Pré-visualizar partilha" disabled={!sourceId} onPress={() => sourceId && onPreviewShare(kind, sourceId)} /> : null}
        </Card>
      ) : null}

      <BrandButton
        testID="compose-submit"
        icon="send"
        variant="gold"
        label={busy ? 'A publicar…' : 'Publicar'}
        loading={busy}
        disabled={(!canPublish && !accessLoading) || busy || !body.trim()}
        onPress={() => onPublish(body.trim(), sourceId ? { kind, sourceId } : null, selectedTopics, attachments?.map((attachment) => attachment.mediaId))}
      />
    </Screen>
  );
}
