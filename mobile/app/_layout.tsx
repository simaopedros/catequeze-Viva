import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  SourceSerif4_400Regular,
  SourceSerif4_600SemiBold,
  SourceSerif4_700Bold,
} from '@expo-google-fonts/source-serif-4';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { colors, fonts } from '../src/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
/** Expo Go stays on native splash (#071d36) until JS hides it. Never wait on fonts. */
void SplashScreen.hideAsync().catch(() => undefined);

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

export default function RootLayout() {
  useFonts({
    SourceSerif4_400Regular,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Gate>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.paper },
            headerTintColor: colors.ink,
            headerTitleStyle: { fontFamily: fonts.serif, fontWeight: '600' },
            contentStyle: { backgroundColor: colors.paper },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'Entrar' }} />
          <Stack.Screen name="two-factor" options={{ title: 'Verificação' }} />
          <Stack.Screen name="forgot-password" options={{ title: 'Recuperar' }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
      </Gate>
    </AuthProvider>
  );
}
