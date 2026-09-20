import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { copy } from '../src/copy/ptBR';
import { ToastProvider } from '../src/feedback/Toast';
import { colors, navigationChrome } from '../src/theme';
import { BrandFontsProvider, useBrandFontsLoaded } from '../src/theme/fonts';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Gate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'booting') return;
    const inPublic = segments[0] === 'login' || segments[0] === 'two-factor' || segments[0] === 'forgot-password';
    if (status === 'guest' && !inPublic) {
      router.replace('/login');
    } else if (status === 'needs2fa' && segments[0] !== 'two-factor') {
      router.replace('/two-factor');
    } else if (status === 'ready' && inPublic) {
      router.replace('/(app)/(tabs)');
    }
  }, [router, segments, status]);

  if (status === 'booting') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return <>{children}</>;
}

function RootNavigation() {
  const fontsLoaded = useBrandFontsLoaded();

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <StatusBar style="dark" backgroundColor={colors.paper} />
        <Gate>
          <Stack screenOptions={navigationChrome}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ title: copy.auth.loginTitle }} />
            <Stack.Screen name="two-factor" options={{ title: copy.auth.twoFactorTitle }} />
            <Stack.Screen name="forgot-password" options={{ title: copy.auth.recoverTitle }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
        </Gate>
      </ToastProvider>
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <BrandFontsProvider>
        <RootNavigation />
      </BrandFontsProvider>
    </GestureHandlerRootView>
  );
}
