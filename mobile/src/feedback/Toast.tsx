import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing, type } from '../theme';

type ToastKind = 'success' | 'error' | 'info';

type ToastApi = {
  show: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastApi>({ show: () => undefined });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [kind, setKind] = useState<ToastKind>('success');
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string, nextKind: ToastKind = 'success') => {
      setMessage(next);
      setKind(nextKind);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
          setMessage(null);
        });
      }, 2400);
    },
    [opacity],
  );

  const value = useMemo(() => ({ show }), [show]);
  const backgroundColor = kind === 'error' ? colors.danger : kind === 'info' ? colors.ink : colors.success;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
          <View style={[styles.toast, { backgroundColor }]} testID="app-toast">
            <Text style={styles.label}>{message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.xxl,
    alignItems: 'center',
  },
  toast: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: 420,
  },
  label: {
    color: colors.white,
    fontFamily: fonts.sansSemibold,
    fontSize: type.bodySm.fontSize,
    fontWeight: '600',
    textAlign: 'center',
  },
});
