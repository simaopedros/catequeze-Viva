import { Image, PenLine, Video } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { colors, elevation, radius, spacing, typography } from '../theme';
import { Avatar, PrimaryButton } from './ui';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function InlineCommunityComposer({
  userName,
  disabled,
  busy,
  error,
  onPublish,
  onComposeMedia,
  expanded: expandedProp,
  onExpandedChange,
}: {
  userName?: string;
  disabled?: boolean;
  busy?: boolean;
  error?: string | null;
  onPublish: (body: string) => Promise<void>;
  onComposeMedia?: (kind: 'image' | 'video') => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [expandedInternal, setExpandedInternal] = useState(false);
  const expanded = expandedProp ?? expandedInternal;
  const [body, setBody] = useState('');
  const inputRef = useRef<TextInput>(null);
  const progress = useRef(new Animated.Value(0)).current;

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

  const open = () => {
    if (disabled) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const close = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(false);
    setBody('');
    Keyboard.dismiss();
  };

  useEffect(() => {
    if (expandedProp === false) {
      setBody('');
      Keyboard.dismiss();
    }
  }, [expandedProp]);

  const publish = async () => {
    const text = body.trim();
    if (!text || busy) return;
    await onPublish(text);
    close();
  };

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
            </Pressable>
          )}
        </View>

        {expanded ? (
          <Animated.View style={[styles.expandedFooter, { opacity: footerOpacity }]}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
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
                icon={Image}
                label="Imagem"
                onPress={() => onComposeMedia?.('image')}
                disabled={disabled || busy}
              />
              <ComposeAction
                testID="compose-action-video"
                icon={Video}
                label="Vídeo"
                onPress={() => onComposeMedia?.('video')}
                disabled={disabled || busy}
              />
            </View>
            <View style={styles.buttonRow}>
              <PrimaryButton label="Cancelar" onPress={close} variant="ghost" fullWidth={false} disabled={busy} />
              <PrimaryButton
                testID="compose-publish"
                label={busy ? 'Publicando…' : 'Publicar'}
                onPress={publish}
                fullWidth={false}
                disabled={busy || !body.trim()}
                loading={busy}
              />
            </View>
          </Animated.View>
        ) : (
          <View style={styles.actionsRow}>
            <ComposeAction testID="compose-action-text" icon={PenLine} label="Texto" onPress={open} disabled={disabled} />
            <ComposeAction
              testID="compose-action-image"
              icon={Image}
              label="Imagem"
              onPress={() => (onComposeMedia ? onComposeMedia('image') : open())}
              disabled={disabled}
            />
            <ComposeAction
              testID="compose-action-video"
              icon={Video}
              label="Vídeo"
              onPress={() => (onComposeMedia ? onComposeMedia('video') : open())}
              disabled={disabled}
            />
          </View>
        )}
      </Animated.View>
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
  expandedFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing[3],
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
