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
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { FeedbackProvider } from '../src/components/Feedback';
import { colors, fontFamilies, paperTheme } from '../src/theme';

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
