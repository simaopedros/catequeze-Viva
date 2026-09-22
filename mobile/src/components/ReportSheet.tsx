import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SocialReportReason } from '../api/types';
import { PrimaryButton } from './ui';
import { colors, radius, spacing, typography } from '../theme';

export const REPORT_REASON_OPTIONS: { id: SocialReportReason; label: string }[] = [
  { id: 'DOCTRINE', label: 'Conteúdo doutrinário inadequado' },
  { id: 'HATE', label: 'Ódio ou ofensa' },
  { id: 'SPAM', label: 'Spam' },
  { id: 'OTHER', label: 'Outro motivo' },
];

export function ReportSheet({
  visible,
  onClose,
  onSubmit,
  busy,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: SocialReportReason) => void;
  busy?: boolean;
}) {
  const [selected, setSelected] = useState<SocialReportReason | null>(null);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" />
      <View style={styles.sheet} testID="report-sheet">
        <Text style={styles.title}>Denunciar publicação</Text>
        <Text style={styles.subtitle}>Escolha o motivo da denúncia.</Text>
        {REPORT_REASON_OPTIONS.map((item) => {
          const active = selected === item.id;
          return (
            <Pressable
              key={item.id}
              testID={`report-reason-${item.id}`}
              onPress={() => setSelected(item.id)}
              style={[styles.option, active && styles.optionActive]}
            >
              <View style={[styles.radio, active && styles.radioActive]} />
              <Text style={styles.optionLabel}>{item.label}</Text>
            </Pressable>
          );
        })}
        <PrimaryButton
          label={busy ? 'A enviar…' : 'Denunciar'}
          disabled={!selected || busy}
          onPress={() => selected && onSubmit(selected)}
          variant="danger"
        />
        <PrimaryButton label="Cancelar" onPress={onClose} variant="ghost" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 29, 54, 0.45)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[6],
    gap: spacing[2],
  },
  title: { ...typography.headingSm, color: colors.primary[800] },
  subtitle: { ...typography.bodySm, color: colors.text.muted, marginBottom: spacing[2] },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: radius.md,
  },
  optionActive: { backgroundColor: colors.primary[50] },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioActive: {
    borderColor: colors.primary[700],
    backgroundColor: colors.primary[700],
  },
  optionLabel: { ...typography.bodyMd, color: colors.text.primary, flex: 1 },
});
