import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { BrandButton, ErrorText, Screen } from '../components/ui';
import { colors, fonts, spacing } from '../theme';

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
      <Text style={{ color: colors.rhemaGold, fontFamily: fonts.serif, fontSize: 28, marginBottom: spacing.md }}>
        Testemunho
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.8)', marginBottom: spacing.lg }}>
        Câmara ou galeria. O + da Comunidade abre aqui, não o compositor de texto.
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.lg }}>
        <Pressable
          testID="upload-camera"
          onPress={onPickCamera}
          style={{
            flex: 1,
            minHeight: 88,
            borderRadius: 16,
            backgroundColor: '#111',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="camera-outline" size={28} color={colors.rhemaGold} />
          <Text style={{ color: '#fff', fontFamily: fonts.sansSemi }}>Câmara</Text>
        </Pressable>
        <Pressable
          testID="upload-gallery"
          onPress={onPickGallery}
          style={{
            flex: 1,
            minHeight: 88,
            borderRadius: 16,
            backgroundColor: '#111',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="images-outline" size={28} color={colors.rhemaGold} />
          <Text style={{ color: '#fff', fontFamily: fonts.sansSemi }}>Galeria</Text>
        </Pressable>
      </View>
      <TextInput
        testID="upload-caption"
        value={caption}
        onChangeText={setCaption}
        placeholder="Uma frase sobre o testemunho"
        placeholderTextColor="rgba(255,255,255,0.4)"
        style={{
          color: '#fff',
          borderWidth: 1,
          borderColor: '#333',
          borderRadius: 12,
          padding: 12,
          minHeight: 80,
          marginBottom: spacing.md,
        }}
        multiline
      />
      <Pressable testID="upload-consent" onPress={() => setConsent((value) => !value)} style={{ marginBottom: spacing.md }}>
        <Text style={{ color: consent ? colors.rhemaGold : 'rgba(255,255,255,0.75)' }}>
          {consent ? '✓ ' : '○ '}Tenho autorização de imagem das pessoas no vídeo.
        </Text>
      </Pressable>
      {progress != null ? (
        <View testID="upload-progress" style={{ height: 6, backgroundColor: '#222', borderRadius: 99, marginBottom: 12 }}>
          <View style={{ width: `${Math.round(progress * 100)}%`, height: 6, backgroundColor: colors.rhemaGold, borderRadius: 99 }} />
        </View>
      ) : null}
      {busy ? <ActivityIndicator color={colors.rhemaGold} /> : null}
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
