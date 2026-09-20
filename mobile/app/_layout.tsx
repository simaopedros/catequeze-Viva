import {
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { FeedbackProvider } from '../src/components/Feedback';
import { resolveDeepLinkHref } from '../src/navigation/deepLinks';
import { colors, fontFamilies, paperTheme } from '../src/theme';

function isPublicSegment(segment: string | undefined) {
  return segment === 'login' || segment === 'two-factor' || segment === 'forgot-password';
}

function Gate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pendingHref = useRef<string | null>(null);

  const inPublic = isPublicSegment(segments[0]);

  const openHref = useCallback(
    (href: string) => {
      if (status !== 'ready' || inPublic) {
        pendingHref.current = href;
        return;
      }
      router.push(href as never);
    },
    [inPublic, router, status],
  );

  useEffect(() => {
    if (status === 'booting') return;
    if (status === 'guest' && !inPublic) {
      router.replace('/login');
    } else if (status === 'needs2fa' && segments[0] !== 'two-factor') {
      router.replace('/two-factor');
    } else if (status === 'ready' && inPublic) {
      router.replace('/(app)/(tabs)');
    }
  }, [inPublic, router, segments, status]);

  useEffect(() => {
    if (status !== 'ready' || inPublic || !pendingHref.current) return;
    const href = pendingHref.current;
    pendingHref.current = null;
    router.push(href as never);
  }, [inPublic, router, status]);

  useEffect(() => {
    let linkingSub: { remove: () => void } | undefined;
    let pushUnsub: (() => void) | undefined;
    let cancelled = false;

    void import('expo-linking').then((Linking) => {
      if (cancelled) return;
      void Linking.getInitialURL().then((url) => {
        const href = resolveDeepLinkHref(url);
        if (href) openHref(href);
      });
      linkingSub = Linking.addEventListener('url', (event) => {
        const href = resolveDeepLinkHref(event.url);
        if (href) openHref(href);
      });
    });

    void import('../src/notifications/push').then((push) => {
      if (cancelled) return;
      pushUnsub = push.subscribeToNotificationOpens((link) => {
        const href = resolveDeepLinkHref(link);
        if (href) openHref(href);
      });
    });

    return () => {
      cancelled = true;
      linkingSub?.remove();
      pushUnsub?.();
    };
  }, [openHref]);

  if (status === 'booting') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    CormorantGaramond_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.ink }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <FeedbackProvider>
            <AuthProvider>
              <StatusBar style="light" backgroundColor={colors.ink} />
              <Gate>
                <Stack
                  screenOptions={{
                    headerStyle: { backgroundColor: colors.ink },
                    headerTintColor: colors.cream,
                    headerTitleStyle: { fontFamily: fontFamilies.semibold, fontSize: 17 },
                    headerShadowVisible: false,
                    contentStyle: { backgroundColor: colors.cream },
                  }}
                >
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="login" options={{ headerShown: false }} />
                  <Stack.Screen name="two-factor" options={{ title: 'Verificação em dois passos' }} />
                  <Stack.Screen name="forgot-password" options={{ title: 'Recuperar acesso' }} />
                  <Stack.Screen name="(app)" options={{ headerShown: false }} />
                </Stack>
              </Gate>
            </AuthProvider>
          </FeedbackProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
