import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { BrandButton, ErrorText, ImmersiveField, ProgressBar, Screen, ScreenTitle } from '../components/ui';
import { colors, fonts, radii, spacing } from '../theme';

export function VideoUploadScreen({
  busy,
  progress,
  error,
  canPublish,
  onPickCamera,
  onPickGallery,
  onPublish,
  onOpenComposer,
}: {
  busy?: boolean;
  progress?: number;
  error?: string | null;
  canPublish?: boolean;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onPublish: (caption: string) => void;
  onOpenComposer?: () => void;
}) {
  const [caption, setCaption] = useState('');
  const [consent, setConsent] = useState(false);
  const ready = Boolean(canPublish) && consent && !busy;

  return (
    <Screen testID="upload-screen" black>
      <ScreenTitle
        immersive
        title="Testemunho"
        subtitle="Câmara ou galeria. O + da Comunidade abre aqui, não o compositor de texto."
      />
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.lg }}>
        <Pressable
          testID="upload-camera"
          onPress={onPickCamera}
          style={{
            flex: 1,
            minHeight: 88,
            borderRadius: radii.md,
            backgroundColor: colors.immersiveElevated,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="camera-outline" size={28} color={colors.gold} />
          <Text style={{ color: colors.white, fontFamily: fonts.sansSemi }}>Câmara</Text>
        </Pressable>
        <Pressable
          testID="upload-gallery"
          onPress={onPickGallery}
          style={{
            flex: 1,
            minHeight: 88,
            borderRadius: radii.md,
            backgroundColor: colors.immersiveElevated,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="images-outline" size={28} color={colors.gold} />
          <Text style={{ color: colors.white, fontFamily: fonts.sansSemi }}>Galeria</Text>
        </Pressable>
      </View>
      <ImmersiveField
        testID="upload-caption"
        value={caption}
        onChangeText={setCaption}
        placeholder="Uma frase sobre o testemunho"
        multiline
        style={{ minHeight: 80, marginBottom: spacing.md }}
      />
      <Pressable testID="upload-consent" onPress={() => setConsent((value) => !value)} style={{ marginBottom: spacing.md }}>
        <Text style={{ color: consent ? colors.gold : colors.onInkMuted }}>
          {consent ? '✓ ' : '○ '}Tenho autorização de imagem das pessoas no vídeo.
        </Text>
      </Pressable>
      {progress != null ? <ProgressBar progress={progress} testID="upload-progress" /> : null}
      {busy ? <ActivityIndicator color={colors.gold} /> : null}
      <ErrorText message={error} />
      <BrandButton
        testID="upload-publish"
        label={busy ? 'A enviar…' : 'Publicar testemunho'}
        disabled={!ready}
        onPress={() => onPublish(caption)}
      />
      {onOpenComposer ? (
        <BrandButton
          variant="ghost"
          ink
          label="Publicação em texto"
          onPress={onOpenComposer}
          testID="upload-open-composer"
        />
      ) : null}
    </Screen>
  );
}
