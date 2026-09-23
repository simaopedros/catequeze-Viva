import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image as ImageIcon, PenLine, Video, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { audienceHint, audienceLabel, type CommunityPublishAudience } from '../community/publishAudience';
import type { CommunityComposePayload, SocialShare, SocialVideoUploadTicket } from '../api/types';
import { CommunityPublishAudiencePicker } from './communityUi';
import { ShareCard } from './PostCard';
import { DEFAULT_COMPOSE_MEDIA_LIMITS, MAX_SOCIAL_VIDEO_BYTES } from '../social/constants';
import { normalizeUploadUri } from '../social/socialMediaUpload';
import {
  type SocialUploadAuth,
  uploadSocialImageFromUri,
  uploadSocialVideoFromUri,
} from '../social/socialMediaUpload';
import { colors, elevation, radius, spacing, typography } from '../theme';
import { Avatar, PrimaryButton } from './ui';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type DraftMedia = {
  key: string;
  mediaId: string;
  kind: 'IMAGE' | 'VIDEO';
  previewUri: string;
  uploading: boolean;
  progress: number;
  error?: string | null;
};

export type InlineComposeMediaConfig = {
  limits?: { maxMediaPerPost: number; maxVideoSeconds: number };
  uploadAuth: SocialUploadAuth;
  requestVideoUpload: (opts: { title?: string; durationSeconds?: number }) => Promise<SocialVideoUploadTicket>;
};

export function InlineCommunityComposer({
  userName,
  disabled,
  busy,
  error,
  onPublish,
  composeMedia,
  expanded: expandedProp,
  onExpandedChange,
  publishAudience,
  onChangePublishAudience,
  parishName,
  repostPreview,
  repostSourceId,
  onClearRepost,
}: {
  userName?: string;
  disabled?: boolean;
  busy?: boolean;
  error?: string | null;
  onPublish: (payload: CommunityComposePayload) => Promise<void>;
  composeMedia?: InlineComposeMediaConfig;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  publishAudience: CommunityPublishAudience;
  onChangePublishAudience: (audience: CommunityPublishAudience) => void;
  parishName?: string | null;
  repostPreview?: SocialShare | null;
  /** Slug da publicação original (republicar). */
  repostSourceId?: string | null;
  onClearRepost?: () => void;
}) {
  const limits = composeMedia?.limits ?? DEFAULT_COMPOSE_MEDIA_LIMITS;
  const [expandedInternal, setExpandedInternal] = useState(false);
  const expanded = expandedProp ?? expandedInternal;
  const [body, setBody] = useState('');
  const [media, setMedia] = useState<DraftMedia[]>([]);
  const [consent, setConsent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const videoAbortRef = useRef<(() => void) | null>(null);

  const uploading = media.some((item) => item.uploading);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: expanded ? 1 : 0,
      useNativeDriver: false,
      friction: 9,
      tension: 80,
    }).start();
  }, [expanded, progress]);

  const borderColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary[700]],
  });

  const shadowOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.04, 0.12],
  });

  const footerOpacity = progress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.6, 1],
  });

  const cardScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.01],
  });

  const setExpanded = (value: boolean) => {
    if (expandedProp === undefined) {
      setExpandedInternal(value);
    }
    onExpandedChange?.(value);
  };

  const resetDraft = () => {
    videoAbortRef.current?.();
    videoAbortRef.current = null;
    setBody('');
    setMedia([]);
    setConsent(false);
    setLocalError(null);
    onClearRepost?.();
    Keyboard.dismiss();
  };

  const open = () => {
    if (disabled) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const close = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(false);
    resetDraft();
  };

  useEffect(() => {
    if (expandedProp === false) {
      resetDraft();
    }
  }, [expandedProp]);

  const atMediaLimit = media.length >= limits.maxMediaPerPost;

  const ensureExpanded = () => {
    if (!expanded) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpanded(true);
    }
  };

  const pickImage = async () => {
    if (disabled || !composeMedia || atMediaLimit) return;
    ensureExpanded();
    setLocalError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setLocalError('Permita o acesso à galeria para enviar imagens.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const key = `pending-${Date.now()}`;
    const previewUri = asset.uri;
    setMedia((current) => [
      ...current,
      {
        key,
        mediaId: key,
        kind: 'IMAGE',
        previewUri,
        uploading: true,
        progress: 0,
      },
    ]);

    try {
      const uploaded = await uploadSocialImageFromUri(
        composeMedia.uploadAuth,
        {
          uri: asset.uri,
          name: asset.fileName || `image-${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
        },
        {
          onProgress: (percent) =>
            setMedia((current) =>
              current.map((item) => (item.key === key ? { ...item, progress: percent } : item)),
            ),
        },
      );
      setMedia((current) =>
        current.map((item) =>
          item.key === key
            ? { ...item, mediaId: uploaded.mediaId, uploading: false, progress: 100 }
            : item,
        ),
      );
    } catch (err) {
      setMedia((current) => current.filter((item) => item.key !== key));
      setLocalError(err instanceof Error ? err.message : 'Falha ao enviar imagem.');
    }
  };

  const pickVideo = async () => {
    if (disabled || !composeMedia || atMediaLimit) return;
    ensureExpanded();
    setLocalError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setLocalError('Permita o acesso à galeria para enviar vídeos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const rawDuration = asset.duration;
    const durationSeconds =
      typeof rawDuration === 'number' && Number.isFinite(rawDuration)
        ? Math.round(rawDuration > 1000 ? rawDuration / 1000 : rawDuration)
        : null;

    if (asset.fileSize && asset.fileSize > MAX_SOCIAL_VIDEO_BYTES) {
      setLocalError('Vídeo demasiado grande. Máximo: 60 MB.');
      return;
    }
    if (durationSeconds && durationSeconds > limits.maxVideoSeconds) {
      setLocalError(
        `Vídeo demasiado longo. Máximo: ${Math.floor(limits.maxVideoSeconds / 60)} min.`,
      );
      return;
    }

    let ticket: SocialVideoUploadTicket;
    try {
      ticket = await composeMedia.requestVideoUpload({
        title: asset.fileName || 'Vídeo da Comunidade',
        durationSeconds: durationSeconds ?? undefined,
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Não foi possível preparar o envio.');
      return;
    }

    const key = ticket.mediaId;
    setMedia((current) => [
      ...current,
      {
        key,
        mediaId: ticket.mediaId,
        kind: 'VIDEO',
        previewUri: asset.uri,
        uploading: true,
        progress: 0,
      },
    ]);

    const upload = uploadSocialVideoFromUri(
      composeMedia.uploadAuth,
      {
        uri: asset.uri,
        name: asset.fileName || `video-${Date.now()}.mp4`,
        mimeType: asset.mimeType || 'video/mp4',
        size: asset.fileSize,
      },
      ticket,
      {
        onProgress: (percent) =>
          setMedia((current) =>
            current.map((item) => (item.key === key ? { ...item, progress: percent } : item)),
          ),
        onSuccess: () =>
          setMedia((current) =>
            current.map((item) =>
              item.key === key ? { ...item, uploading: false, progress: 100 } : item,
            ),
          ),
        onError: (uploadError) => {
          setMedia((current) => current.filter((item) => item.key !== key));
          setLocalError(uploadError.message);
        },
      },
    );
    videoAbortRef.current = upload.abort;
  };

  const removeMedia = (key: string) => {
    setMedia((current) => current.filter((item) => item.key !== key));
  };

  const canSubmit =
    !busy &&
    !uploading &&
    (body.trim().length > 0 || media.length > 0 || Boolean(repostSourceId)) &&
    (media.length === 0 || consent);

  const destinationLabel = audienceLabel(publishAudience, parishName);

  const publish = async () => {
    if (!canSubmit) return;
    const mediaIds = media.filter((item) => !item.uploading).map((item) => item.mediaId);
    await onPublish({
      body: body.trim(),
      mediaIds,
      mediaConsentAck: mediaIds.length > 0 ? consent : false,
      audience: publishAudience,
      share: repostSourceId ? { kind: 'POST', sourceId: repostSourceId } : null,
    });
    close();
  };

  const displayError = localError || error;

  return (
    <Animated.View
      testID="community-compose-card"
      style={[
        styles.card,
        elevation.card,
        {
          borderColor,
          shadowOpacity,
          transform: [{ scale: cardScale }],
        },
      ]}
    >
      <View style={styles.topRow}>
        <Avatar name={userName || 'Eu'} size={40} />
        {expanded ? (
          <TextInput
            ref={inputRef}
            testID="compose-input"
            value={body}
            onChangeText={setBody}
            placeholder="O que você gostaria de compartilhar?"
            placeholderTextColor={colors.text.placeholder}
            style={styles.input}
            multiline
            editable={!disabled && !busy}
          />
        ) : (
          <Pressable onPress={open} disabled={disabled} style={styles.placeholderPress} testID="compose-open-field">
            <Text style={styles.placeholder}>O que você gostaria de compartilhar?</Text>
            <Text style={styles.destinationHint} testID="compose-destination-collapsed">
              Publicar em: {destinationLabel}
            </Text>
          </Pressable>
        )}
      </View>

      {expanded ? (
        <CommunityPublishAudiencePicker
          value={publishAudience}
          onChange={onChangePublishAudience}
          parishName={parishName}
          disabled={disabled || busy}
        />
      ) : null}

      {expanded && repostPreview ? (
        <View style={styles.repostCard} testID="compose-repost-preview">
          <View style={styles.repostHeader}>
            <Text style={styles.repostTitle}>Republicar publicação</Text>
            <Pressable onPress={onClearRepost} hitSlop={8} testID="compose-repost-clear">
              <X size={18} color={colors.text.muted} />
            </Pressable>
          </View>
          <ShareCard
            kind={repostPreview.sourceLabel || 'Publicação'}
            title={repostPreview.title}
            subtitle={repostPreview.subtitle}
            excerpt={repostPreview.excerpt}
          />
        </View>
      ) : null}

      {expanded ? (
        <Text style={styles.audienceHint}>{audienceHint(publishAudience)}</Text>
      ) : null}

      {expanded && media.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaStrip}>
          {media.map((item) => (
            <View key={item.key} style={styles.mediaThumbWrap} testID={`compose-media-${item.kind}`}>
              {item.kind === 'IMAGE' ? (
                <Image source={{ uri: normalizeUploadUri(item.previewUri) }} style={styles.mediaThumb} />
              ) : (
                <ComposerVideoPreview uri={normalizeUploadUri(item.previewUri)} />
              )}
              {item.uploading ? (
                <View style={styles.mediaOverlay}>
                  <ActivityIndicator color={colors.surface} size="small" />
                  <Text style={styles.mediaProgress}>{item.progress}%</Text>
                </View>
              ) : null}
              <Pressable
                style={styles.mediaRemove}
                onPress={() => removeMedia(item.key)}
                accessibilityLabel="Remover mídia"
                testID="compose-media-remove"
              >
                <X size={14} color={colors.surface} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {expanded ? (
        <Animated.View style={[styles.expandedFooter, { opacity: footerOpacity }]}>
          {displayError ? <Text style={styles.error}>{displayError}</Text> : null}
          {media.length > 0 ? (
            <Pressable
              style={styles.consentRow}
              onPress={() => setConsent((value) => !value)}
              testID="compose-media-consent"
            >
              <View style={[styles.consentBox, consent && styles.consentBoxChecked]}>
                {consent ? <Text style={styles.consentMark}>✓</Text> : null}
              </View>
              <Text style={styles.consentLabel}>
                Confirmo que tenho autorização para publicar estas imagens ou vídeos.
              </Text>
            </Pressable>
          ) : null}
          <View style={styles.actionsRow}>
            <ComposeAction
              testID="compose-action-text"
              icon={PenLine}
              label="Texto"
              onPress={() => inputRef.current?.focus()}
              disabled={disabled || busy}
            />
            <ComposeAction
              testID="compose-action-image"
              icon={ImageIcon}
              label="Imagem"
              onPress={pickImage}
              disabled={disabled || busy || !composeMedia || atMediaLimit}
            />
            <ComposeAction
              testID="compose-action-video"
              icon={Video}
              label="Vídeo"
              onPress={pickVideo}
              disabled={disabled || busy || !composeMedia || atMediaLimit}
            />
          </View>
          <View style={styles.buttonRow}>
            <PrimaryButton label="Cancelar" onPress={close} variant="ghost" fullWidth={false} disabled={busy} />
            <PrimaryButton
              testID="compose-publish"
              label={busy ? 'Publicando…' : 'Publicar'}
              onPress={publish}
              fullWidth={false}
              disabled={!canSubmit}
              loading={busy}
            />
          </View>
        </Animated.View>
      ) : (
        <View style={styles.actionsRow}>
          <ComposeAction testID="compose-action-text" icon={PenLine} label="Texto" onPress={open} disabled={disabled} />
          <ComposeAction
            testID="compose-action-image"
            icon={ImageIcon}
            label="Imagem"
            onPress={pickImage}
            disabled={disabled || !composeMedia}
          />
          <ComposeAction
            testID="compose-action-video"
            icon={Video}
            label="Vídeo"
            onPress={pickVideo}
            disabled={disabled || !composeMedia}
          />
        </View>
      )}
    </Animated.View>
  );
}

function ComposerVideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });

  return (
    <VideoView
      player={player}
      style={styles.mediaThumb}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

function ComposeAction({
  icon: Icon,
  label,
  onPress,
  disabled,
  testID,
}: {
  icon: typeof PenLine;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} disabled={disabled} style={styles.composeAction}>
      <Icon size={18} color={colors.primary[800]} />
      <Text style={styles.composeActionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[4],
    shadowColor: '#0B1927',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  placeholderPress: { flex: 1, minHeight: 40, justifyContent: 'center' },
  placeholder: {
    ...typography.bodyMd,
    color: colors.text.placeholder,
  },
  destinationHint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[700],
  },
  audienceHint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.text.muted,
    marginBottom: spacing[2],
  },
  repostCard: {
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repostTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    flex: 1,
    minHeight: 88,
    maxHeight: 160,
    fontSize: typography.bodyMd.fontSize,
    lineHeight: typography.bodyMd.lineHeight,
    color: colors.text.primary,
    textAlignVertical: 'top',
    paddingVertical: 4,
  },
  mediaStrip: {
    marginBottom: spacing[3],
    marginHorizontal: -spacing[1],
  },
  mediaThumbWrap: {
    width: 88,
    height: 88,
    marginHorizontal: spacing[1],
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.skeleton,
  },
  videoThumb: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 25, 39, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mediaProgress: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '600',
  },
  mediaRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(11, 25, 39, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing[3],
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  consentBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.primary[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  consentBoxChecked: {
    backgroundColor: colors.primary[700],
  },
  consentMark: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  consentLabel: {
    flex: 1,
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing[1],
  },
  composeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    minHeight: 40,
    paddingHorizontal: spacing[2],
  },
  composeActionLabel: {
    ...typography.labelLg,
    color: colors.primary[800],
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing[2],
  },
});
