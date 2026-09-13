import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { BrandButton, ErrorText, ProgressBar, Screen } from '../components/ui';
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
      <Text style={{ color: colors.gold, fontFamily: fonts.serif, fontSize: 28, marginBottom: spacing.md }}>
        Testemunho
      </Text>
      <Text style={{ color: colors.onInkMuted, marginBottom: spacing.lg }}>
        Câmara ou galeria. O + da Comunidade abre aqui, não o compositor de texto.
      </Text>
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
      <TextInput
        testID="upload-caption"
        value={caption}
        onChangeText={setCaption}
        placeholder="Uma frase sobre o testemunho"
        placeholderTextColor={colors.onInkMuted}
        style={{
          color: colors.white,
          borderWidth: 1,
          borderColor: colors.immersiveLine,
          borderRadius: radii.sm,
          padding: spacing.sm,
          minHeight: 80,
          marginBottom: spacing.md,
        }}
        multiline
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
