import { CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { colors, type } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

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
    CormorantGaramond_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Gate>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.cream },
            headerTintColor: colors.ink,
            headerTitleStyle: { fontFamily: type.bodyBold },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.cream },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="two-factor" options={{ title: 'Verificação' }} />
          <Stack.Screen name="forgot-password" options={{ title: 'Recuperar senha' }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
      </Gate>
    </AuthProvider>
  );
}
