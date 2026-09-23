import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, radius, spacing } from '../theme';

export function LoginBrandMark({ size = 88 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" testID="login-brand-mark">
      <Path
        d="M48 8 L58 22 L72 18 L66 32 L80 38 L66 44 L72 58 L58 54 L48 68 L38 54 L24 58 L30 44 L16 38 L30 32 L24 18 L38 22 Z"
        fill="#F7B733"
        opacity={0.95}
      />
      <Path
        d="M28 62 L28 38 C28 30 34 24 48 24 C62 24 68 30 68 38 L68 62 Z"
        fill="#173B61"
      />
      <Path d="M34 62 L34 42 C34 36 38 32 48 32 C58 32 62 36 62 42 L62 62 Z" fill="#F7F8FA" />
      <Rect x="45" y="30" width="6" height="22" rx="2" fill="#173B61" />
      <Rect x="38" y="38" width="20" height="6" rx="2" fill="#173B61" />
      <Path
        d="M26 58 C32 52 40 49 48 49 C56 49 64 52 70 58"
        stroke="#F1A51E"
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LoginBrandHeader() {
  return (
    <View style={styles.brandBlock} testID="login-brand-header">
      <LoginBrandMark size={92} />
      <Text style={styles.brandCatequese}>Catequese</Text>
      <Text style={styles.brandViva}>Viva</Text>
    </View>
  );
}

type IconFieldProps = TextInputProps & {
  icon: 'mail' | 'lock';
  testID?: string;
};

export function LoginIconField({ icon, testID, style, ...props }: IconFieldProps) {
  const Icon = icon === 'mail' ? Mail : Lock;
  return (
    <View style={styles.fieldWrap}>
      <Icon size={20} color={colors.primary[700]} strokeWidth={2.2} />
      <TextInput
        testID={testID}
        placeholderTextColor={colors.text.placeholder}
        style={[styles.fieldInput, style]}
        autoCapitalize="none"
        {...props}
      />
    </View>
  );
}

export function LoginPasswordField({
  testID,
  value,
  onChangeText,
  ...props
}: Omit<TextInputProps, 'secureTextEntry'>) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Lock size={20} color={colors.primary[700]} strokeWidth={2.2} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        placeholder="Senha"
        placeholderTextColor={colors.text.placeholder}
        style={styles.fieldInput}
        autoCapitalize="none"
        autoComplete="password"
        {...props}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
        testID="login-password-toggle"
      >
        {visible ? (
          <EyeOff size={20} color={colors.text.placeholder} strokeWidth={2} />
        ) : (
          <Eye size={20} color={colors.text.placeholder} strokeWidth={2} />
        )}
      </Pressable>
    </View>
  );
}

function ChurchSilhouette() {
  return (
    <Svg width={72} height={56} viewBox="0 0 72 56" style={styles.church}>
      <Path
        d="M36 4 L42 16 H54 L48 22 V48 H24 V22 L18 16 H30 Z"
        fill="#E8C98A"
      />
      <Rect x="33" y="2" width="6" height="10" rx="1" fill="#D4A85C" />
    </Svg>
  );
}

export function LoginFooterArt() {
  return (
    <View style={styles.footer} pointerEvents="none" testID="login-footer-art">
      <LinearGradient
        colors={['#FDE8C8', '#F5B84A', '#E8943A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.footerWaveBack}
      />
      <View style={styles.footerWaveMid} />
      <View style={styles.footerWaveFront} />
      <ChurchSilhouette />
    </View>
  );
}

const styles = StyleSheet.create({
  brandBlock: {
    alignItems: 'center',
    paddingTop: spacing[8],
    paddingBottom: spacing[6],
  },
  brandCatequese: {
    marginTop: spacing[4],
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.primary[900],
    letterSpacing: -0.3,
  },
  brandViva: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: '#E8A020',
    letterSpacing: -0.3,
    marginTop: -2,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    minHeight: 52,
    marginBottom: spacing[4],
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: spacing[3],
  },
  footer: {
    height: 120,
    marginTop: spacing[6],
    overflow: 'hidden',
  },
  footerWaveBack: {
    position: 'absolute',
    left: -40,
    right: -20,
    bottom: -20,
    height: 100,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 80,
    opacity: 0.55,
  },
  footerWaveMid: {
    position: 'absolute',
    left: -20,
    right: 0,
    bottom: -30,
    height: 90,
    backgroundColor: '#F9CF85',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 60,
    opacity: 0.75,
  },
  footerWaveFront: {
    position: 'absolute',
    left: 0,
    right: -30,
    bottom: -35,
    height: 80,
    backgroundColor: '#FDEACC',
    borderTopLeftRadius: 90,
    borderTopRightRadius: 50,
  },
  church: {
    position: 'absolute',
    right: spacing[8],
    bottom: spacing[2],
  },
});
