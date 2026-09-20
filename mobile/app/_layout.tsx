import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { copy } from '../src/copy/ptBR';
import { ToastProvider } from '../src/feedback/Toast';
import { needsOnboarding } from '../src/navigation/navContext';
import { colors, navigationChrome } from '../src/theme';
import { BrandFontsProvider, useBrandFontsLoaded } from '../src/theme/fonts';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Gate({ children }: { children: React.ReactNode }) {
  const { status, bootstrap } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'booting') return;
    const first = String(segments[0] || '');
    const inPublic = first === 'login' || first === 'two-factor' || first === 'forgot-password' || first === 'signup';
    if (status === 'guest' && !inPublic) {
      router.replace('/login');
    } else if (status === 'needs2fa' && first !== 'two-factor') {
      router.replace('/two-factor');
    } else if (status === 'ready' && needsOnboarding(bootstrap) && first !== 'onboarding') {
      router.replace('/onboarding');
    } else if (status === 'ready' && inPublic) {
      router.replace('/(app)/(tabs)');
    }
  }, [bootstrap, router, segments, status]);

  if (status === 'booting') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.ink} />
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
      <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <StatusBar style="dark" />
        <Gate>
          <Stack screenOptions={navigationChrome}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ title: copy.auth.loginTitle, headerShown: false }} />
            <Stack.Screen name="signup" options={{ title: copy.signup.title, headerShown: false }} />
            <Stack.Screen name="two-factor" options={{ title: copy.auth.twoFactorTitle }} />
            <Stack.Screen name="forgot-password" options={{ title: copy.auth.recoverTitle }} />
            <Stack.Screen name="onboarding" options={{ title: copy.onboarding.title }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
        </Gate>
      </ToastProvider>
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <BrandFontsProvider>
        <RootNavigation />
      </BrandFontsProvider>
    </GestureHandlerRootView>
  );
}
