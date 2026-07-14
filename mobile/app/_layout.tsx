import 'react-native-gesture-handler';
import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  CormorantGaramond_300Light,
  CormorantGaramond_300Light_Italic,
  CormorantGaramond_400Regular,
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { colors } from '@theme/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_300Light_Italic,
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.pearl }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.pearl }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.pearl },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
            <Stack.Screen name="onboarding/index" options={{ animation: 'fade' }} />
            <Stack.Screen name="onboarding/role" />
            <Stack.Screen name="onboarding/auth" />
            <Stack.Screen name="onboarding/quiz" />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen
              name="praticien/[id]"
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="domain/[slug]" />
            <Stack.Screen name="booking/slot" />
            <Stack.Screen name="booking/payment" />
            <Stack.Screen name="booking/confirmation" options={{ animation: 'fade' }} />
            <Stack.Screen name="chat/[id]" />
            <Stack.Screen name="event/[id]" />
            <Stack.Screen name="exchange/index" />
            <Stack.Screen name="exchange/[id]" />
            <Stack.Screen name="exchange/create" options={{ presentation: 'modal' }} />
            <Stack.Screen name="payment-history" />
            <Stack.Screen name="refund-request" options={{ presentation: 'modal', title: 'Remboursement' }} />
            <Stack.Screen name="cercles/index" />
            <Stack.Screen name="cercles/[id]" />
            <Stack.Screen name="blog/index" />
            <Stack.Screen name="blog/[slug]" />
            <Stack.Screen name="review" options={{ presentation: 'modal' }} />
            <Stack.Screen name="report" options={{ presentation: 'modal' }} />
            <Stack.Screen name="founder" />
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="subscription" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
