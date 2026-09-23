import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

const BOX_COUNT = 6;

export function OtpCodeInput({
  value,
  onChange,
  testID,
}: {
  value: string;
  onChange: (next: string) => void;
  testID?: string;
}) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.replace(/\D/g, '').slice(0, BOX_COUNT).split('');
  while (digits.length < BOX_COUNT) digits.push('');

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      style={styles.row}
      accessibilityRole="none"
    >
      <TextInput
        ref={inputRef}
        testID={testID}
        value={value.replace(/\D/g, '').slice(0, BOX_COUNT)}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, BOX_COUNT))}
        keyboardType="number-pad"
        maxLength={BOX_COUNT}
        style={styles.hiddenInput}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        accessibilityLabel="Código de verificação de 6 dígitos"
      />
      {digits.map((digit, index) => (
        <View key={`otp-${index}`} style={[styles.box, digit ? styles.boxFilled : null]}>
          <Text style={styles.boxText}>{digit}</Text>
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  box: {
    flex: 1,
    maxWidth: 48,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: colors.primary[600],
  },
  boxText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    padding: 0,
  },
});
