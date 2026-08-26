import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { LockScreen } from '@/components/LockScreen';
import { ToastHost } from '@/components/ui';
import { AppProvider, useApp } from '@/context/AppProvider';

SplashScreen.preventAutoHideAsync();

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  return (
    <AppProvider>
      <RootNavigation />
    </AppProvider>
  );
}

function RootNavigation() {
  const { ready, settings, colors, scheme } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const onOnboarding = segments[0] === 'onboarding';
    if (!settings.onboardingDone && !onOnboarding) {
      router.replace('/onboarding');
    } else if (settings.onboardingDone && onOnboarding) {
      router.replace('/(tabs)');
    }
  }, [ready, settings.onboardingDone, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0C2340' }}>
        <ActivityIndicator color="#C4A35A" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="compromisso" />
        <Stack.Screen name="importar" options={{ presentation: 'modal' }} />
        <Stack.Screen name="assuntos" />
      </Stack>
      <LockScreen />
      <ToastHost />
    </View>
  );
}
